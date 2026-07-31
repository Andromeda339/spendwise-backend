// src/middleware/uploadMiddleware.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// 1. Конфігуруємо підключення до твого акаунта Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Налаштовуємо сховище: куди і в якому форматі зберігати
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'finance_receipts', // Назва папки, яка створиться в Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Дозволені формати фото
    transformation: [{ width: 800, crop: 'limit' }] // Легка оптимізація розміру
  },
});

// 3. Експортуємо готовий мідлвар
export const upload = multer({ storage });