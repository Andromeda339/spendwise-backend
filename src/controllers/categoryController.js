import * as categoryService from '../services/categoryService.js';

export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id; 
    const categories = await categoryService.getAllCategories(userId);
    res.json(categories);
  } catch (error) {
    console.error('Помилка в categoryController (getCategories):', error);
    res.status(500).json({ error: 'Не вдалося завантажити категорії' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, type, isStorage, householdId, clientId } = req.body;
    
    const userId = req.user.id;
    const userHouseholdId = req.user.householdId;

    if (!name || !type) {
      return res.status(400).json({ error: 'Поля name та type є обов\'язковими' });
    }

    const allowedTypes = ['INCOME', 'EXPENSE']; 
    if (!allowedTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Неправильний тип категорії. Дозволені: INCOME, EXPENSE' });
    }

    // БЕЗПЕКА: Визначаємо безпечний householdId
    let safeHouseholdId = null;
    if (householdId && parseInt(householdId) === userHouseholdId) {
      safeHouseholdId = userHouseholdId;
    }

    const newCategory = await categoryService.createCategory({
      name,
      type: type.toUpperCase(),
      isStorage: isStorage || false,
      userId: userId, 
      householdId: safeHouseholdId,
      clientId
    });

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Помилка при створенні категорії:', error);
    res.status(500).json({ error: 'Не вдалося створити категорію' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, isStorage } = req.body;
    const userId = req.user.id;
    const userHouseholdId = req.user.householdId;

    // ПЕРЕДАЄМО userId для підтримки пошуку по clientId
    const category = await categoryService.getCategoryById(id, userId);
    if (!category) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }

    // БЕЗПЕКА 1: Забороняємо редагувати системні (глобальні) категорії
    if (category.userId === null && category.householdId === null) {
      return res.status(403).json({ error: 'Системні категорії не можна змінювати' });
    }

    // БЕЗПЕКА 2: Перевіряємо, чи має юзер право редагувати цю категорію
    const isOwner = category.userId === userId;
    const isHouseholdMember = userHouseholdId && category.householdId === userHouseholdId;

    if (!isOwner && !isHouseholdMember) {
      return res.status(403).json({ error: 'У вас немає прав для редагування цієї категорії' });
    }

    if (type) {
      const allowedTypes = ['INCOME', 'EXPENSE']; 
      if (!allowedTypes.includes(type.toUpperCase())) {
        return res.status(400).json({ error: 'Неправильний тип категорії. Дозволені: INCOME, EXPENSE' });
      }
    }

    // ПЕРЕДАЄМО userId для підтримки оновлення по clientId
    const updatedCategory = await categoryService.updateCategory(id, userId, {
      name,
      type: type ? type.toUpperCase() : undefined,
      isStorage
    });

    res.json(updatedCategory);
  } catch (error) {
    console.error('Помилка при оновленні категорії:', error);
    res.status(500).json({ error: 'Не вдалося оновити категорію' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // ПЕРЕДАЄМО userId для підтримки пошуку по clientId
    const category = await categoryService.getCategoryById(id, userId);
    if (!category) {
      return res.status(404).json({ error: 'Категорію не знайдено' });
    }

    // БЕЗПЕКА 1: Забороняємо видаляти системні категорії
    if (category.userId === null && category.householdId === null) {
      return res.status(403).json({ error: 'Системні категорії не можна видаляти' });
    }

    // БЕЗПЕКА 2: Видаляти може ТІЛЬКИ безпосередній творець (власник)
    if (category.userId !== userId) {
      return res.status(403).json({ error: 'Тільки автор категорії має право її видалити' });
    }

    // ПЕРЕДАЄМО userId для підтримки видалення по clientId
    await categoryService.deleteCategory(id, userId);
    res.json({ message: 'Категорію успішно видалено' });
  } catch (error) {
    console.error('Помилка при видаленні категорії:', error);
    res.status(500).json({ error: 'Не вдалося видалити категорію' });
  }
};