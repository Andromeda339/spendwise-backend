import express from 'express';
import multer from 'multer';
import { 
  createTransaction, 
  getTransactions, 
  updateTransaction,  
  deleteTransaction,
  getStats,
  getSummary,
  exportTransactionsCsv,
  transferFunds,
  uploadReceipt,
  scanReceipt
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

// Налаштовуємо Multer для сканера (пам'ять)
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Усі маршрути нижче захищені токеном
router.use(protect);

router.post('/', createTransaction);
router.get('/', getTransactions);

// ПЕРЕКАЗИ
router.post('/transfer', transferFunds);

// СТАТИСТИКА ТА ЕКСПОРТ (перед маршрутами з /:id)
router.get('/stats', getStats); 
router.get('/summary', getSummary); 
router.get('/export', exportTransactionsCsv); 

// СКАНЕР ЧЕКІВ (Залишено без змін за твоїм запитом)
router.post('/scan', uploadMemory.single('receipt'), scanReceipt);

// ЧЕКИ: завантаження фото для конкретної транзакції (в Cloudinary)
router.post('/:id/receipt', (req, res, next) => {
  const uploadMiddleware = upload.single('receipt');
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("🔴 СПРАВЖНЯ ПОМИЛКА CLOUDINARY:", err);
      return res.status(500).json({ 
        error: "Щось пішло не так при завантаженні", 
        details: err.message || err 
      });
    }
    next();
  });
}, uploadReceipt);

router.put('/:id', updateTransaction);     
router.delete('/:id', deleteTransaction);  

export default router;