import { prisma } from '../config/db.js';
import crypto from 'crypto';

export const getHouseholdStats = async (householdId) => {
  const accounts = await prisma.account.findMany({
    where: { householdId: householdId }
  });
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const expenseFilter = {
    account: { householdId: householdId },
    type: 'EXPENSE',
    isTransfer: false,
    transactionDate: { gte: startOfMonth, lte: endOfMonth }
  };

  const monthlyExpenses = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: expenseFilter
  });
  const totalExpenses = Number(monthlyExpenses._sum.amount || 0);

  const expensesByUser = await prisma.transaction.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    where: expenseFilter
  });

  const userIds = expensesByUser.map(e => e.userId).filter(id => id !== null);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, login: true }
  });

  const expensesWithLogins = expensesByUser.map(e => {
    const u = users.find(user => user.id === e.userId);
    return {
      userId: e.userId,
      login: u ? u.login : 'Невідомо',
      totalAmount: Number(e._sum.amount || 0)
    };
  });

  return {
    householdId,
    totalBalance,
    month: { start: startOfMonth, end: endOfMonth },
    totalExpenses,
    expensesByUser: expensesWithLogins
  };
};

// Створення родини перенесено в сервіс з підтримкою clientId
export const createHousehold = async (userId, name, clientId) => {
  // Офлайн-захист: перевіряємо, чи вже створювали родину з таким clientId
  if (clientId) {
    const existing = await prisma.household.findFirst({ where: { clientId } });
    if (existing) {
      // Якщо родина вже є, перевіряємо, чи прив'язаний юзер, і повертаємо її
      await prisma.user.update({ where: { id: userId }, data: { householdId: existing.id } });
      return existing;
    }
  }

  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  const inviteCode = `HOME-${randomHex}`;

  return await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: { 
        name, 
        inviteCode,
        clientId: clientId || null
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: { householdId: household.id }
    });

    return household;
  });
};

// Приєднання до родини перенесено в сервіс
export const joinHousehold = async (userId, inviteCode) => {
  const household = await prisma.household.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() }
  });

  if (!household) {
    throw new Error('Родину з таким кодом запрошення не знайдено');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { householdId: household.id }
  });

  return household;
};

// Отримання інформації про родину перенесено в сервіс
export const getHouseholdById = async (householdId) => {
  return await prisma.household.findUnique({
    where: { id: householdId },
    include: { users: { select: { id: true, login: true } } }
  });
};

// Вихід з родини перенесено в сервіс
export const leaveHousehold = async (userId, currentHouseholdId) => {
  const membersCount = await prisma.user.count({
    where: { householdId: currentHouseholdId }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { householdId: null }
  });

  if (membersCount <= 1) {
    await prisma.household.delete({
      where: { id: currentHouseholdId }
    });
    return { deleted: true };
  }

  return { deleted: false };
};