/*
  Warnings:

  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Venue` table. All the data in the column will be lost.
  - Added the required column `buyerEmail` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "Venue" DROP CONSTRAINT "Venue_tenantId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "userId",
ADD COLUMN     "buyerEmail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Venue" DROP COLUMN "tenantId";
