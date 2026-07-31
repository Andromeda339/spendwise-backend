import { processReceipt } from '../services/scannerService.js';

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Немає файлу' });

    const result = await processReceipt(req.file.buffer);
    res.status(200).json({ message: 'Чек успішно відскановано', scannedData: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};