import express from 'express';
import { 
  createAccount, 
  getAccounts, 
  getAccountById, 
  updateAccount, 
  deleteAccount 
} from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Застосовуємо охоронця до ВСІХ маршрутів у цьому файлі
router.use(protect);

router.post('/', createAccount);       // Створення рахунку
router.get('/', getAccounts);         // Отримання всіх доступних рахунків
router.get('/:id', getAccountById);   // Отримання одного рахунку за ID
router.put('/:id', updateAccount);     // Оновлення рахунку за ID
router.delete('/:id', deleteAccount);  // Видалення рахунку за ID

export default router;