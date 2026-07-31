import express from 'express';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js'; 
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Захищаємо всі маршрути категорій
router.use(protect);

router.get('/', getCategories);
router.post('/', createCategory);

// ДОДАНО: Роути для оновлення та видалення
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;