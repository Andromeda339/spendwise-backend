/*
  Warnings:

  - A unique constraint covering the columns `[userId,clientId]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,clientId]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,clientId]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,clientId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_clientId_key" ON "accounts"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_clientId_key" ON "budgets"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_clientId_key" ON "categories"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_userId_clientId_key" ON "transactions"("userId", "clientId");
