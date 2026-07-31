import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

let serviceAccount;

const token = process.env.FIREBASE_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;

if (token) {
  serviceAccount = JSON.parse(token);
} else {
  // Якщо змінної взагалі немає (локальна розробка) — зчитуємо файл із кореня проєкту
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-admin.json', 'utf8'));
}

// Ініціалізуємо Firebase додаток за новим синтаксисом
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Експортуємо сервіс авторизації
export const firebaseAuth = getAuth(app);
