import * as householdService from '../services/householdService.js';

export const createHousehold = async (req, res) => {
  try {
    const { name, clientId } = req.body;
    const userId = req.user.id; 
    const userHouseholdId = req.user.householdId;

    if (!name) {
      return res.status(400).json({ error: 'Назва родини є обов\'язковою' });
    }

    if (userHouseholdId) {
      return res.status(400).json({ error: 'Ви вже перебуваєте в родині. Спочатку вийдіть з неї.' });
    }

    const newHousehold = await householdService.createHousehold(userId, name, clientId);
    res.status(201).json(newHousehold);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinHousehold = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id; 
    const userHouseholdId = req.user.householdId;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Будь ласка, вкажіть код запрошення (inviteCode)' });
    }

    if (userHouseholdId) {
      return res.status(400).json({ error: 'Ви вже перебуваєте в родині. Спочатку залишіть поточну.' });
    }

    const household = await householdService.joinHousehold(userId, inviteCode);
    res.status(200).json({ message: `Ви успішно приєдналися до родини "${household.name}"` });
  } catch (error) {
    // Якщо сервіс викинув помилку (наприклад, невірний код), повертаємо 404/400
    res.status(error.message.includes('не знайдено') ? 404 : 500).json({ error: error.message });
  }
};

export const getHousehold = async (req, res) => {
  try {
    const userHouseholdId = req.user.householdId;

    if (!userHouseholdId) {
      return res.status(404).json({ error: 'Ви не перебуваєте в родині' });
    }

    const household = await householdService.getHouseholdById(userHouseholdId);
    res.status(200).json(household);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const userHouseholdId = req.user.householdId;

    if (!userHouseholdId) {
      return res.status(400).json({ error: 'Ви не перебуваєте в жодній родині' });
    }

    const stats = await householdService.getHouseholdStats(userHouseholdId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const leaveHousehold = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentHouseholdId = req.user.householdId;

    if (!currentHouseholdId) {
      return res.status(400).json({ error: 'Ви не перебуваєте в родині' });
    }

    const result = await householdService.leaveHousehold(userId, currentHouseholdId);
    
    if (result.deleted) {
      return res.status(200).json({ message: 'Ви вийшли з родини. Родина була видалена, оскільки в ній не залишилося учасників.' });
    }

    res.status(200).json({ message: 'Ви успішно вийшли з родини.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};