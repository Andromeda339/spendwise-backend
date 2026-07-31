import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Починаємо сідінг бази даних... 🌱');

  // Визначаємо набір базових системних категорій
  const defaultCategories = [
    // Доходи
    { name: 'Зарплата', type: TransactionType.INCOME, isStorage: false },
    { name: 'Подарунки', type: TransactionType.INCOME, isStorage: false },
    { name: 'Кешбек та відсотки', type: TransactionType.INCOME, isStorage: false },
    
    // Витрати
    { name: 'Продукти харчування', type: TransactionType.EXPENSE, isStorage: false },
    { name: 'Транспорт і авто', type: TransactionType.EXPENSE, isStorage: false },
    { name: 'Комуналка та інтернет', type: TransactionType.EXPENSE, isStorage: false },
    { name: 'Розваги та кафе', type: TransactionType.EXPENSE, isStorage: false },
    { name: 'Здоров\'я та аптеки', type: TransactionType.EXPENSE, isStorage: false },
    { name: 'Одяг та краса', type: TransactionType.EXPENSE, isStorage: false },

    // Спеціальна категорія (Аналог банки Monobank)
    // Технічно поповнення банки — це витрата з поточного рахунку
    { name: 'Зберігання коштів (Банка)', type: TransactionType.EXPENSE, isStorage: true },
  ];

  for (const category of defaultCategories) {
    // Шукаємо, чи є вже така системна категорія (userId: null)
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: category.name,
        userId: null // Шукаємо тільки серед глобальних
      }
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: category
      });
      console.log(`✅ Створено категорію: ${category.name}`);
    } else {
      console.log(`⏩ Категорія вже існує: ${category.name}`);
    }
  }

  // Опціонально: Можна створити тестового користувача для зручності розробки
  const testUserLogin = 'test_user';
  const existingUser = await prisma.user.findUnique({ where: { login: testUserLogin } });
  
  if (!existingUser) {
    await prisma.user.create({
      data: {
        login: testUserLogin,
        passwordHash: 'dummy_hash_for_testing_123', // У реальному житті тут має бути bcrypt hash
      }
    });
    console.log(`✅ Створено тестового користувача: ${testUserLogin}`);
  }

  console.log('Сідінг успішно завершено! 🚀');
}

main()
  .catch((e) => {
    console.error('❌ Помилка під час сідінгу:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });