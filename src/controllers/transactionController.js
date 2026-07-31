import fs from 'fs';
import { prisma } from '../config/db.js';
import * as transactionService from '../services/transactionService.js';
import { processReceipt } from '../services/scannerService.js';

export const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id; 
    const householdId = req.user.householdId; 
    
    const { clientId, accountId, categoryId, type, amount, transactionDate, description, receiptUrl } = req.body;
    
    if (!accountId || !categoryId || !type || !amount || !transactionDate) {
      return res.status(400).json({ error: 'Усі поля, крім опису та чека, є обов’язковими' });
    }

    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({ error: 'Тип транзакції має бути INCOME або EXPENSE' });
    }

    const transaction = await transactionService.createTransaction(userId, householdId, {
        clientId, accountId, categoryId, type, amount, transactionDate, description, receiptUrl
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { accountId, page = 1, limit = 10, startDate, endDate } = req.query; 

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const result = await transactionService.getTransactionsByUserId(
      userId, 
      householdId,
      accountId, 
      pageNum, 
      limitNum, 
      startDate, 
      endDate
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { id } = req.params; 

    const updated = await transactionService.updateTransaction(userId, householdId, id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { id } = req.params; 

    const result = await transactionService.deleteTransaction(userId, householdId, id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Будь ласка, вкажіть startDate та endDate' });
    }

    const validTypes = ['EXPENSE', 'INCOME'];
    const transactionType = validTypes.includes(type) ? type : 'EXPENSE'; 

    const stats = await transactionService.getTransactionStats(userId, householdId, startDate, endDate, transactionType);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { accountId, startDate, endDate } = req.query;

    const summary = await transactionService.getTransactionSummary(
      userId,
      householdId,
      accountId,
      startDate,
      endDate
    );

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const exportTransactionsCsv = async (req, res) => {
  try {
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const { accountId, startDate, endDate } = req.query;

    const transactions = await transactionService.getAllTransactionsForExport(userId, householdId, accountId, startDate, endDate);

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Немає транзакцій для експорту за цей період' });
    }

    let csv = 'Дата;Тип;Категорія;Рахунок;Сума;Опис\n';

    transactions.forEach(t => {
      const date = t.transactionDate.toISOString().split('T')[0];
      const type = t.type === 'INCOME' ? 'Дохід' : 'Витрата';
      const category = t.category ? t.category.name : 'Переказ/Системне';
      const account = t.account.name;
      const amount = parseFloat(t.amount);
      const description = t.description ? `"${t.description.replace(/"/g, '""')}"` : '';

      csv += `${date};${type};${category};${account};${amount};${description}\n`;
    });

    const bom = '\uFEFF';

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('transactions.csv');
    
    return res.send(bom + csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const transferFunds = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description, date } = req.body;
    const userId = req.user.id;
    const householdId = req.user.householdId;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ error: 'Вкажіть fromAccountId, toAccountId та amount' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Неможливо переказати кошти на той самий рахунок' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Сума переказу має бути більшою за нуль' });
    }

    const result = await transactionService.createTransfer(
      userId, 
      householdId,
      fromAccountId, 
      toAccountId, 
      amount, 
      description, 
      date
    );

    res.status(201).json({
      message: 'Переказ успішно виконано',
      data: result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params; 
    const userId = req.user.id;
    const householdId = req.user.householdId;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл чека не знайдено' });
    }

    const isClientId = isNaN(id);

    const transaction = await prisma.transaction.findFirst({
      where: isClientId
        ? { userId: userId, clientId: id } 
        : { 
            id: parseInt(id),
            account: { 
              OR: [
                { userId: userId },
                ...(householdId ? [{ householdId: householdId }] : [])
              ]
            } 
          }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено або доступ заборонено' });
    }

    const receiptUrl = req.file.path; 

    const receipt = await prisma.receipt.upsert({
      where: { transactionId: transaction.id },
      update: { receiptUrl: receiptUrl },
      create: { 
        transactionId: transaction.id, 
        receiptUrl: receiptUrl 
      }
    });

    res.status(200).json({
      message: 'Чек успішно завантажено',
      data: receipt
    });
  } catch (error) {
    console.error('Помилка завантаження чека:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера при завантаженні файлу' });
  }
};

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл чека не знайдено' });
    }

    let fileBuffer;
    if (req.file.buffer) {
        fileBuffer = req.file.buffer; 
    } else if (req.file.path) {
        fileBuffer = fs.readFileSync(req.file.path); 
    } else {
        return res.status(400).json({ error: 'Некоректний формат файлу' });
    }

    const scannedData = await processReceipt(fileBuffer);

    if (!scannedData.totalAmount || scannedData.totalAmount === 0) {
      return res.status(200).json({
        message: 'Чек завантажено, але не вдалося автоматично розпізнати суму. Введіть її вручну.',
        scannedData: { date: scannedData.date, totalAmount: null },
        receiptUrl: req.file.path || null
      });
    }

    res.status(200).json({
      message: 'Чек успішно розпізнано',
      scannedData,
      receiptUrl: req.file.path || null
    });

  } catch (error) {
    console.error('Помилка сканування чека:', error);
    res.status(500).json({ error: 'Помилка сервера при обробці чека' });
  }
};