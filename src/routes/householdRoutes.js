import express from 'express';
import { 
  createHousehold, 
  joinHousehold, 
  getHousehold, 
  getStats, 
  leaveHousehold 
} from '../controllers/householdController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Усі маршрути родини залізобетонно закриваємо авторизацією Firebase
router.use(protect);

router.post('/', createHousehold);
router.post('/join', joinHousehold);
router.get('/me', getHousehold);
router.get('/stats', getStats);
router.post('/leave', leaveHousehold); 

export default router;