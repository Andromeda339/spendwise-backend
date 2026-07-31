import express from 'express';
import { setBudget, getBudgets, deleteBudget } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Усі маршрути бюджету залізобетонно вимагають токен
router.use(protect); 

router.post('/', setBudget);      // Встановити/оновити бюджет (без змін для фронту)
router.get('/', getBudgets);      // Отримати бюджети на місяць (без змін для фронту)

// ДОДАНО: Новий маршрут для видалення конкретного бюджету
router.delete('/:id', deleteBudget); 

export default router;