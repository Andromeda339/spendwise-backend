import * as budgetService from '../services/budgetService.js';

export const setBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId; // Автоматично беремо з токена

    const budget = await budgetService.setBudget(userId, householdId, req.body);
    res.status(200).json(budget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Будь ласка, вкажіть month та year у параметрах запиту' });
    }

    const budgets = await budgetService.getBudgets(userId, householdId, month, year);
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userHouseholdId = req.user.householdId;

    const budget = await budgetService.getBudgetById(id, userId);
    
    if (!budget) {
      return res.status(404).json({ error: 'Бюджет не знайдено' });
    }

    const isOwner = budget.userId === userId;
    const isHouseholdMember = userHouseholdId && budget.householdId === userHouseholdId;

    if (!isOwner && !isHouseholdMember) {
      return res.status(403).json({ error: 'Доступ заборонено. Це не ваш бюджет.' });
    }

    await budgetService.deleteBudget(id, userId);
    res.json({ message: 'Бюджет успішно видалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};