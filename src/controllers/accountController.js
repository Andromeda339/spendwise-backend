import * as accountService from '../services/accountService.js';

export const createAccount = async (req, res) => {
  try {
    const { name, type, balance, currency, isFamilyAccount, clientId } = req.body;
    const userId = req.user.id; 
    const userHouseholdId = req.user.householdId; 

    const allowedTypes = ['CASH', 'CARD', 'DEPOSIT', 'OTHER', 'JAR'];
    if (!name || !type || !allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Необхідно вказати назву рахунку та правильний тип' });
    }

    const allowedCurrencies = ['UAH', 'USD', 'EUR'];
    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({ error: 'Непідтримувана валюта. Дозволені: UAH, USD, EUR' });
    }

    let safeHouseholdId = null;
    if (isFamilyAccount && userHouseholdId) {
      safeHouseholdId = userHouseholdId;
    }

    const account = await accountService.createAccount(userId, name, type, balance, currency, safeHouseholdId, clientId);
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = await accountService.getAccountsByUserId(userId);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userHouseholdId = req.user.householdId;

    const account = await accountService.getAccountById(id, userId);
    
    if (!account) {
      return res.status(404).json({ error: 'Рахунок не знайдено' });
    }

    // БЕЗПЕКА: Перевіряємо, чи має юзер право бачити цей рахунок
    const isOwner = account.userId === userId;
    const isHouseholdMember = userHouseholdId && account.householdId === userHouseholdId;

    if (!isOwner && !isHouseholdMember) {
      return res.status(403).json({ error: 'Доступ заборонено. Це не ваш рахунок' });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, balance, currency } = req.body;
    const userId = req.user.id;
    const userHouseholdId = req.user.householdId;

    const account = await accountService.getAccountById(id, userId);
    if (!account) {
      return res.status(404).json({ error: 'Рахунок не знайдено' });
    }

    // БЕЗПЕКА: Редагувати може власник або член родини (якщо рахунок спільний)
    const isOwner = account.userId === userId;
    const isHouseholdMember = userHouseholdId && account.householdId === userHouseholdId;

    if (!isOwner && !isHouseholdMember) {
      return res.status(403).json({ error: 'У вас немає прав для редагування цього рахунку' });
    }

    if (type && !['CASH', 'CARD', 'DEPOSIT', 'OTHER', 'JAR'].includes(type)) {
      return res.status(400).json({ error: 'Неправильний тип рахунку' });
    }

    if (currency && !['UAH', 'USD', 'EUR'].includes(currency)) {
      return res.status(400).json({ error: 'Непідтримувана валюта' });
    }

    const updatedAccount = await accountService.updateAccount(id, userId, { name, type, balance, currency });
    res.json(updatedAccount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const account = await accountService.getAccountById(id, userId);
    if (!account) {
      return res.status(404).json({ error: 'Рахунок не знайдено' });
    }

    // БЕЗПЕКА: Видалити рахунок може ТІЛЬКИ його безпосередній творець (власник)
    if (account.userId !== userId) {
      return res.status(403).json({ error: 'Тільки власник рахунку має право його видалити' });
    }

    await accountService.deleteAccount(id, userId);
    res.json({ message: 'Рахунок успішно видалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};