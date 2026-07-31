import { firebaseAuth } from '../config/firebase.js';
import { prisma } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Доступ заборонено, токен відсутній' });
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);

    // 1. Швидке читання з бази (Працює миттєво, не навантажує сервер)
    let user = await prisma.user.findUnique({
      where: { id: decodedToken.uid }
    });

    // 2. Якщо юзера немає (той самий перший запит) — створюємо його ОДИН раз
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: decodedToken.uid, 
          email: decodedToken.email,
          // 👇 ТУТ БУЛИ ВІДСУТНІ ЗВОРОТНІ ЛАПКИ
          login: `${decodedToken.email.split('@')[0]}_${decodedToken.uid.slice(0, 4)}`,
          passwordHash: null
        }
      });
  
      console.log(`✨ Ліниво створено нового користувача в БД: ${user.login}`);
    }

    // Записуємо готового юзера в req
    req.user = {
      ...user,
      uid: user.id 
    };

    return next();
  } catch (error) {
    console.error('Помилка валідації Firebase токена:', error.message);
    return res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }
};