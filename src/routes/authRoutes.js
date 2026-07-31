// src/routes/authRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { syncUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/sync', protect, syncUser);

export default router;