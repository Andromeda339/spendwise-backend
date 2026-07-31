import { prisma } from '../config/db.js';

// ОТРИМАННЯ КАТЕГОРІЙ (ГЛОБАЛЬНІ + ОСОБИСТІ + СІМЕЙНІ)
export const getAllCategories = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true }
  });

  return await prisma.category.findMany({
    where: {
      OR: [
        { userId: null, householdId: null }, 
        { userId: userId },                  
        ...(user?.householdId ? [{ householdId: user.householdId }] : []) 
      ]
    },
    orderBy: { name: 'asc' } 
  });
};

// СТВОРЕННЯ КАТЕГОРІЇ (З підтримкою Upsert для офлайну)
export const createCategory = async (data) => {
  const categoryData = {
    name: data.name,
    type: data.type,
    isStorage: data.isStorage || false,
    userId: data.userId,
    householdId: data.householdId,
    clientId: data.clientId || null 
  };

  if (data.clientId && data.userId) {
    return await prisma.category.upsert({
      where: { userId_clientId: { userId: data.userId, clientId: data.clientId } },
      update: categoryData,
      create: categoryData
    });
  }

  return await prisma.category.create({
    data: categoryData
  });
};

// ОТРИМАННЯ ОДНІЄЇ КАТЕГОРІЇ (Поліморфне: по ID або clientId)
export const getCategoryById = async (id, userId) => {
  const isClientId = isNaN(id);

  return await prisma.category.findFirst({
    where: isClientId 
      ? { userId_clientId: { userId, clientId: id } }
      : { id: parseInt(id) }
  });
};

// ОНОВЛЕННЯ КАТЕГОРІЇ (Поліморфне: по ID або clientId)
export const updateCategory = async (id, userId, data) => {
  const isClientId = isNaN(id);
  const whereCondition = isClientId 
    ? { userId_clientId: { userId, clientId: id } }
    : { id: parseInt(id) };

  return await prisma.category.update({
    where: whereCondition,
    data: {
      name: data.name,
      type: data.type,
      isStorage: data.isStorage
    }
  });
};

// ВИДАЛЕННЯ КАТЕГОРІЇ (Поліморфне: по ID або clientId)
export const deleteCategory = async (id, userId) => {
  const isClientId = isNaN(id);
  const whereCondition = isClientId 
    ? { userId_clientId: { userId, clientId: id } }
    : { id: parseInt(id) };

  return await prisma.category.delete({
    where: whereCondition
  });
};