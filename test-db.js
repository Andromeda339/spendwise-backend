import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Дістаємо Pool із пакета pg (специфіка роботи CommonJS пакетів в ESM)
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('⏳ Підключаємось до бд');

  try {
    const categories = await prisma.category.findMany();
    console.log(`\n✅ Успішно знайдено ${categories.length} категорій:`);
    console.table(categories);

    console.log('\n🎉 Тест пройдено');
  } catch (error) {
    console.error('\n❌ Помилка під час тесту:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();