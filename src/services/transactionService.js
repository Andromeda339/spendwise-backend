import { prisma } from '../config/db.js';

// 1. СТВОРЕННЯ / UPSERT ТРАНЗАКЦІЇ (Повна підтримка офлайн-режиму)
export const createTransaction = async (userId, householdId, { clientId, accountId, categoryId, type, amount, description, transactionDate, receiptUrl }) => {
  const amountNumber = parseFloat(amount);

  const account = await prisma.account.findUnique({
    where: { id: accountId }
  });

  if (!account) throw new Error('Рахунок не знайдено');

  const isPersonalOwner = account.userId === userId;
  const isHouseholdOwner = householdId && account.householdId === householdId;

  if (!isPersonalOwner && !isHouseholdOwner) {
    throw new Error('Доступ заборонено або рахунок вам не належить');
  }

  // Перевіряємо, чи така транзакція вже існує в базі (замінено на надійний findFirst)
  let existingTx = null;
  if (clientId) {
    existingTx = await prisma.transaction.findFirst({
      where: { userId, clientId }
    });
  }

  const oldAmount = existingTx ? parseFloat(existingTx.amount) : 0;
  const deltaAmount = amountNumber - oldAmount;

  // ПЕРЕВІРКА БЮДЖЕТУ (Спрацьовує тільки якщо витрати збільшуються)
  if (type === 'EXPENSE' && deltaAmount > 0) {
    const txDate = new Date(transactionDate);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();
    const startOfMonth = new Date(txYear, txDate.getMonth(), 1);
    const endOfMonth = new Date(txYear, txDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const isHouseholdAccount = !!account.householdId;

    const budget = await prisma.budget.findFirst({
      where: {
        categoryId: parseInt(categoryId),
        month: txMonth,
        year: txYear,
        ...(isHouseholdAccount
          ? { householdId: account.householdId }
          : { userId: userId, householdId: null })
      }
    });

    if (budget) {
      const existingExpenses = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          categoryId: parseInt(categoryId),
          type: 'EXPENSE',
          isTransfer: false,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
          ...(isHouseholdAccount
            ? { account: { householdId: account.householdId } }
            : { userId: userId, account: { householdId: null } })
        }
      });

      const totalSpentSoFar = parseFloat(existingExpenses._sum.amount || 0);
      const budgetLimit = parseFloat(budget.maxAmount);

      // Перевіряємо ліміт з урахуванням дельти (різниці)
      if (totalSpentSoFar + deltaAmount > budgetLimit) {
        const remaining = Math.max(0, budgetLimit - totalSpentSoFar);
        const budgetName = isHouseholdAccount ? "СІМЕЙНОГО" : "ОСОБИСТОГО";
        throw new Error(
          `Категорія заблокована! Перевищено ліміт ${budgetName} бюджету. Залишок: ${remaining} UAH. Спроба додатково витратити: ${deltaAmount} UAH.`
        );
      }
    }
  }

  // Виконуємо операцію в транзакції БД
  return await prisma.$transaction(async (tx) => {
    let transaction;

    if (existingTx) {
      // 🔄 ЯКЩО ІСНУЄ: Робимо оновлення (ідемпотентний перезапис)
      transaction = await tx.transaction.update({
        where: { id: existingTx.id },
        data: {
          accountId,
          categoryId: parseInt(categoryId),
          type,
          amount: amountNumber,
          description,
          transactionDate: new Date(transactionDate)
        }
      });

      // Коригуємо баланс рахунку на основі старого значення
      await tx.account.update({
        where: { id: existingTx.accountId },
        data: {
          balance: existingTx.type === 'INCOME' ? { decrement: oldAmount } : { increment: oldAmount }
        }
      });
      
      // Нараховуємо новий баланс рахунку
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: type === 'INCOME' ? { increment: amountNumber } : { decrement: amountNumber }
        }
      });

    } else {
      // ЯКЩО НОВА: Створюємо звичайним шляхом
      transaction = await tx.transaction.create({
        data: {
          clientId,
          accountId,
          categoryId: parseInt(categoryId),
          userId,
          type,
          amount: amountNumber,
          description,
          transactionDate: new Date(transactionDate)
        }
      });

      // Оновлюємо баланс рахунку
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: type === 'INCOME' ? { increment: amountNumber } : { decrement: amountNumber }
        }
      });
    }

    // Робота з чеком
    if (receiptUrl) {
      await tx.receipt.upsert({
        where: { transactionId: transaction.id },
        update: { receiptUrl },
        create: { transactionId: transaction.id, receiptUrl }
      });
    }

    return await tx.transaction.findUnique({
        where: { id: transaction.id },
        include: { receipt: true }
    });
  });
};

// 2. ОТРИМАННЯ ТРАНЗАКЦІЙ
export const getTransactionsByUserId = async (userId, householdId, accountId, page = 1, limit = 10, startDate, endDate) => {
  const whereCondition = {
    account: {
      OR: [
        { userId: userId },
        ...(householdId ? [{ householdId: householdId }] : [])
      ]
    }
  };

  if (accountId) {
    whereCondition.accountId = parseInt(accountId);
  }

  if (startDate || endDate) {
    whereCondition.transactionDate = {};
    if (startDate) whereCondition.transactionDate.gte = new Date(startDate); 
    if (endDate) whereCondition.transactionDate.lte = new Date(endDate);   
  }

  const totalTransactions = await prisma.transaction.count({
    where: whereCondition
  });

  const skip = (page - 1) * limit;

  const transactions = await prisma.transaction.findMany({
    where: whereCondition,
    skip: skip,
    take: limit,
    orderBy: { transactionDate: 'desc' },
    include: { 
      category: true, 
      account: true,
      user: { select: { login: true } }
    }
  });

  return {
    data: transactions,
    meta: {
      totalItems: totalTransactions,
      currentPage: page,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalTransactions / limit)
    }
  };
};

// 3. ВИДАЛЕННЯ ТРАНЗАКЦІЇ (Поліморфне: працює з ID та з clientId)
export const deleteTransaction = async (userId, householdId, transactionId) => {
  const isClientId = isNaN(transactionId);

  const transaction = await prisma.transaction.findFirst({
    where: isClientId
      ? { userId: userId, clientId: transactionId } 
      : { id: parseInt(transactionId) },
    include: { account: true }
  });

  if (!transaction) {
    throw new Error('Транзакцію не знайдено');
  }

  const isPersonalOwner = transaction.account.userId === userId;
  const isHouseholdOwner = householdId && transaction.account.householdId === householdId;

  if (!isPersonalOwner && !isHouseholdOwner) {
    throw new Error('Доступ заборонено');
  }

  return await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: { id: transaction.id }
    });

    const amountNumber = parseFloat(transaction.amount);
    await tx.account.update({
      where: { id: transaction.accountId },
      data: {
        balance: transaction.type === 'EXPENSE'
          ? { increment: amountNumber }
          : { decrement: amountNumber }
      }
    });

    return { message: 'Транзакцію успішно видалено, баланс оновлено' };
  });
};

// 4. ОНОВЛЕННЯ ТРАНЗАКЦІЇ (Поліморфне: працює з ID та з clientId)
export const updateTransaction = async (userId, householdId, transactionId, updateData) => {
  const isClientId = isNaN(transactionId);

  const oldTransaction = await prisma.transaction.findFirst({
    where: isClientId
      ? { userId: userId, clientId: transactionId } 
      : { id: parseInt(transactionId) },
    include: { account: true }
  });

  if (!oldTransaction) {
    throw new Error('Транзакцію не знайдено');
  }

  const hasAccessOld = oldTransaction.account.userId === userId || 
                       (householdId && oldTransaction.account.householdId === householdId);

  if (!hasAccessOld) {
    throw new Error('Доступ заборонено');
  }

  return await prisma.$transaction(async (tx) => {
    const oldAmount = parseFloat(oldTransaction.amount);
    
    // Скасовуємо старий вплив на баланс рахунку
    await tx.account.update({
      where: { id: oldTransaction.accountId },
      data: {
        balance: oldTransaction.type === 'EXPENSE'
          ? { increment: oldAmount }
          : { decrement: oldAmount }
      }
    });

    const targetAccountId = updateData.accountId ? parseInt(updateData.accountId) : oldTransaction.accountId;
    const targetAccount = await tx.account.findUnique({ where: { id: targetAccountId } });
    
    if (!targetAccount) {
      throw new Error('Цільовий рахунок не знайдено');
    }

    const hasAccessTarget = targetAccount.userId === userId || 
                            (householdId && targetAccount.householdId === householdId);

    if (!hasAccessTarget) {
      throw new Error('Цільовий рахунок вам не належить або доступ заборонено');
    }

    const updatedTransaction = await tx.transaction.update({
      where: { id: oldTransaction.id },
      data: {
        accountId: targetAccountId,
        categoryId: updateData.categoryId ? parseInt(updateData.categoryId) : oldTransaction.categoryId,
        type: updateData.type || oldTransaction.type,
        amount: updateData.amount ? parseFloat(updateData.amount) : oldTransaction.amount,
        description: updateData.description !== undefined ? updateData.description : oldTransaction.description,
        transactionDate: updateData.transactionDate ? new Date(updateData.transactionDate) : oldTransaction.transactionDate
      }
    });

    // Нараховуємо новий вплив на баланс рахунку
    const newAmount = parseFloat(updatedTransaction.amount);
    await tx.account.update({
      where: { id: updatedTransaction.accountId },
      data: {
        balance: updatedTransaction.type === 'INCOME'
          ? { increment: newAmount }
          : { decrement: newAmount }
      }
    });

    return updatedTransaction;
  });
};

// 5. АНАЛІТИКА
export const getTransactionStats = async (userId, householdId, startDate, endDate, type = 'EXPENSE') => {
  const stats = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      account: {
        OR: [
          { userId: userId },
          ...(householdId ? [{ householdId: householdId }] : [])
        ]
      }, 
      type: type,                  
      isTransfer: false, 
      transactionDate: {
        gte: new Date(startDate),  
        lte: new Date(endDate)     
      }
    },
    _sum: {
      amount: true 
    }
  });

  if (stats.length === 0) return [];

  const categoryIds = stats.map(stat => stat.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true }
  });

  return stats.map(stat => {
    const category = categories.find(c => c.id === stat.categoryId);
    return {
      categoryId: stat.categoryId,
      categoryName: category ? category.name : 'Невідома категорія',
      totalAmount: stat._sum.amount
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount); 
};

// 6. ЗАГАЛЬНА АНАЛІТИКА
export const getTransactionSummary = async (userId, householdId, accountId, startDate, endDate) => {
  const whereCondition = {
    isTransfer: false,
    account: {
      OR: [
        { userId: userId },
        ...(householdId ? [{ householdId: householdId }] : [])
      ]
    }
  };

  if (accountId) {
    whereCondition.accountId = parseInt(accountId);
  }

  if (startDate || endDate) {
    whereCondition.transactionDate = {};
    if (startDate) whereCondition.transactionDate.gte = new Date(startDate);
    if (endDate) whereCondition.transactionDate.lte = new Date(endDate);
  }

  const stats = await prisma.transaction.groupBy({
    by: ['type'],
    where: whereCondition,
    _sum: {
      amount: true
    }
  });

  let totalIncome = 0;
  let totalExpense = 0;

  stats.forEach(item => {
    const sum = item._sum.amount ? parseFloat(item._sum.amount) : 0;
    if (item.type === 'INCOME') totalIncome = sum;
    if (item.type === 'EXPENSE') totalExpense = sum;
  });

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense
  };
};

// 7. СТВОРЕННЯ ВНУТРІШНЬОГО ПЕРЕКАЗУ
export const createTransfer = async (userId, householdId, fromAccountId, toAccountId, amount, description, date) => {
  const transferAmount = parseFloat(amount);

  const fromAccount = await prisma.account.findUnique({ where: { id: fromAccountId } });
  const toAccount = await prisma.account.findUnique({ where: { id: toAccountId } });

  if (!fromAccount) throw new Error('Рахунок відправника не знайдено');
  if (!toAccount) throw new Error('Рахунок отримувача не знайдено');
  
  const hasAccessFrom = fromAccount.userId === userId || (householdId && fromAccount.householdId === householdId);
  const hasAccessTo = toAccount.userId === userId || (householdId && toAccount.householdId === householdId);

  if (!hasAccessFrom) throw new Error('Рахунок відправника вам не належить або доступ заборонено');
  if (!hasAccessTo) throw new Error('Рахунок отримувача вам не належить або доступ заборонено');

  if (fromAccount.currency !== toAccount.currency) {
    throw new Error('Перекази між різними валютами поки не підтримуються');
  }
  
  if (parseFloat(fromAccount.balance) < transferAmount) {
    throw new Error('Недостатньо коштів на рахунку відправника');
  }

  let transferCategory = await prisma.category.findFirst({
    where: { name: 'Переказ', userId: null }
  });
  
  if (!transferCategory) {
    transferCategory = await prisma.category.create({
      data: { name: 'Переказ', type: 'EXPENSE', isStorage: false }
    });
  }

  return await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: transferAmount } }
    });

    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: transferAmount } }
    });

    const txDate = date ? new Date(date) : new Date();

    const expenseTx = await tx.transaction.create({
      data: {
        accountId: fromAccountId,
        categoryId: transferCategory.id,
        userId: userId, 
        type: 'EXPENSE',
        amount: transferAmount,
        description: description || 'Переказ коштів',
        transactionDate: txDate,
        isTransfer: true,
        relatedAccountId: toAccountId
      }
    });

    const incomeTx = await tx.transaction.create({
      data: {
        accountId: toAccountId,
        categoryId: transferCategory.id,
        userId: userId, 
        type: 'INCOME',
        amount: transferAmount,
        description: description || 'Переказ коштів',
        transactionDate: txDate,
        isTransfer: true,
        relatedAccountId: fromAccountId
      }
    });

    return { expenseTx, incomeTx };
  });
};

// 8. ЕКСПОРТ
export const getAllTransactionsForExport = async (userId, householdId, accountId, startDate, endDate) => {
  const whereCondition = {
    account: {
      OR: [
        { userId: userId },
        ...(householdId ? [{ householdId: householdId }] : [])
      ]
    }
  };

  if (accountId) {
    whereCondition.accountId = parseInt(accountId);
  }

  if (startDate || endDate) {
    whereCondition.transactionDate = {};
    if (startDate) whereCondition.transactionDate.gte = new Date(startDate);
    if (endDate) whereCondition.transactionDate.lte = new Date(endDate);
  }

  return await prisma.transaction.findMany({
    where: whereCondition,
    orderBy: { transactionDate: 'desc' },
    include: { 
      category: true, 
      account: true,
      user: { select: { login: true } }
    }
  });
};