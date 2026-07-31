import express from 'express';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js'; 
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import householdRoutes from './routes/householdRoutes.js';
import './config/firebase.js';
import cors from 'cors';

console.log("=== ТЕСТ БАЗИ З ЕНВ: ===", process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 5000;

// Мідлвари
app.use(express.json());
// Налаштування CORS
app.use(cors({
  origin: '*', // Поки що дозволяємо всі домени (для тестування). Потім сюди впишемо адресу вашого готового фронтенду.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true // Дозволяє передавати заголовки авторизації
}));

// Підключаємо маршрути (всі разом і ДО запуску сервера)
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/households', householdRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер SpendWise успішно запущено на порту ${PORT}!`);
});