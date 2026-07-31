import { prisma } from '../config/db.js';

// СТВОРЕННЯ НОВОГО РАХУНКУ (З підтримкою Upsert для офлайну)
export const createAccount = async (userId, name, type, balance, currency, householdId, clientId) => {
  const accountData = {
    userId: userId,
    name: name,
    type: type,
    balance: !isNaN(parseFloat(balance)) ? parseFloat(balance) : 0.00,
    currency: currency || 'UAH', 
    householdId: householdId ? parseInt(householdId) : null,
    clientId: clientId || null
  };

  // ОПТИМІЗАЦІЯ: Якщо є clientId, робимо upsert, щоб уникнути дублікатів при повторній синхронізації
  if (clientId) {
    return await prisma.account.upsert({
      where: { userId_clientId: { userId, clientId } },
      update: accountData,
      create: accountData
    });
  }

  return await prisma.account.create({
    data: accountData
  });
};

// ОТРИМАННЯ ВСІХ РАХУНКІВ КОРИСТУВАЧА (ВКЛЮЧНО З СІМЕЙНИМИ)
export const getAccountsByUserId = async (userId) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { householdId: true }
  });

  return await prisma.account.findMany({
    where: {
      OR: [
        { userId: userId },
        ...(user?.householdId ? [{ householdId: user.householdId }] : [])
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
};

// ОТРИМАННЯ ОДНОГО РАХУНКУ ЗА ID АБО CLIENT_ID
export const getAccountById = async (id, userId) => {
  const isClientId = isNaN(id);

  return await prisma.account.findFirst({
    where: isClientId 
      ? { userId_clientId: { userId, clientId: id } }
      : { id: parseInt(id) }
  });
};

// ОНОВЛЕННЯ РАХУНКУ (Поліморфне: по ID або clientId)
export const updateAccount = async (id, userId, data) => {
  const isClientId = isNaN(id);
  const whereCondition = isClientId 
    ? { userId_clientId: { userId, clientId: id } }
    : { id: parseInt(id) };

  return await prisma.account.update({
    where: whereCondition,
    data: {
      name: data.name,
      type: data.type,
      balance: data.balance !== undefined && !isNaN(parseFloat(data.balance)) ? parseFloat(data.balance) : undefined,
      currency: data.currency
    }
  });
};

// ВИДАЛЕННЯ РАХУНКУ (Поліморфне: по ID або clientId)
export const deleteAccount = async (id, userId) => {
  const isClientId = isNaN(id);
  const whereCondition = isClientId 
    ? { userId_clientId: { userId, clientId: id } }
    : { id: parseInt(id) };

  return await prisma.account.delete({
    where: whereCondition
  });
};