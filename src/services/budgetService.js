import { prisma } from '../config/db.js';

export const setBudget = async (userId, householdId, budgetData) => {
  const { categoryId, maxAmount, month, year, isPersonal = true, clientId } = budgetData;

  const targetCategoryId = Number(categoryId);
  const targetMonth = Number(month);
  const targetYear = Number(year);

  if (!isPersonal && !householdId) {
    throw new Error('Ви не перебуваєте в родині. Спочатку створіть родину або приєднайтеся до неї.');
  }

  const targetHouseholdId = isPersonal ? null : householdId;

  // Валідація категорії
  const category = await prisma.category.findUnique({
    where: { id: targetCategoryId }
  });

  if (!category) throw new Error('Категорію не знайдено');
  if (category.type === 'INCOME') throw new Error('Не можна встановити ліміт на доходи. Бюджети призначені лише для витрат!');

  // Перевірка прав доступу до категорії
  const isGlobalCategory = category.userId === null && category.householdId === null;
  const isMyCategory = category.userId === userId;
  const isFamilyCategory = householdId && category.householdId === householdId;

  if (!isGlobalCategory && !isMyCategory && !isFamilyCategory) {
    throw new Error('Доступ заборонено. Ви не можете використовувати цю категорію.');
  }

  // Шукаємо існуючий бюджет (Ідемпотентність: гарантує один бюджет на категорію в місяць)
  const existingBudget = await prisma.budget.findFirst({
    where: {
      categoryId: targetCategoryId,
      month: targetMonth,
      year: targetYear,
      ...(isPersonal ? { userId: userId, householdId: null } : { householdId: householdId })
    }
  });

  const parsedMaxAmount = !isNaN(parseFloat(maxAmount)) ? parseFloat(maxAmount) : 0.00;

  if (existingBudget) {
    return await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { 
        maxAmount: parsedMaxAmount,
        clientId: clientId || existingBudget.clientId // 👈 Оновлюємо clientId, якщо він прийшов
      },
      include: { category: { select: { name: true } } }
    });
  }

  return await prisma.budget.create({
    data: {
      userId: userId, 
      householdId: targetHouseholdId, 
      categoryId: targetCategoryId,
      maxAmount: parsedMaxAmount,
      month: targetMonth,
      year: targetYear,
      clientId: clientId || null 
    },
    include: { category: { select: { name: true } } }
  });
};

export const getBudgets = async (userId, householdId, month, year) => {
  const targetMonth = Number(month);
  const targetYear = Number(year);

  const budgets = await prisma.budget.findMany({
    where: {
      month: targetMonth,
      year: targetYear,
      OR: [
        { userId: userId, householdId: null },
        ...(householdId ? [{ householdId: householdId }] : [])
      ]
    },
    include: { category: { select: { name: true } } }
  });

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const budgetsWithProgress = await Promise.all(budgets.map(async (budget) => {
    const isHouseholdBudget = !!budget.householdId;

    const aggregations = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        transactionDate: { gte: startDate, lte: endDate },
        ...(isHouseholdBudget 
            ? { account: { householdId: budget.householdId } }
            : { userId: userId }
        )
      },
    });

    const spentAmount = Number(aggregations._sum.amount || 0);
    const maxAmount = Number(budget.maxAmount);
    const remainingAmount = maxAmount - spentAmount;
    
    const spentPercentage = maxAmount > 0 
      ? Number(((spentAmount / maxAmount) * 100).toFixed(1)) 
      : 0;

    return {
      ...budget,
      type: isHouseholdBudget ? 'HOUSEHOLD' : 'PERSONAL',
      spentAmount,
      remainingAmount,
      spentPercentage
    };
  }));

  return budgetsWithProgress;
};

export const getBudgetById = async (id, userId) => {
  const isClientId = isNaN(id);
  
  return await prisma.budget.findFirst({ 
    where: isClientId 
      ? { userId: userId, clientId: id } // ✨ Тепер поля пласкі
      : { id: Number(id) } 
  });
};

export const deleteBudget = async (id, userId) => {
  const isClientId = isNaN(id);

  if (isClientId) {
    return await prisma.budget.deleteMany({ 
      where: { userId: userId, clientId: id } 
    });
  }

  return await prisma.budget.delete({ 
    where: { id: Number(id) } 
  });
};