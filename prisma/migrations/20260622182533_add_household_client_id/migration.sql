/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `households` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "households" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "households_clientId_key" ON "households"("clientId");
