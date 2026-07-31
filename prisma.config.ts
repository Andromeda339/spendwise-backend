import "dotenv/config";
import { defineConfig, env } from "prisma/config"; // Додали імпорт env

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // ВИКОРИСТОВУЄМО tsx ЗАМІСТЬ ts-node
    seed: "npx tsx prisma/seed.ts", 
  },
  datasource: {
    url: env("DATABASE_URL"), // Використовуємо Prisma-функцію
  },
});