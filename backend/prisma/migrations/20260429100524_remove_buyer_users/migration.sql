/*
  Warnings:

  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Venue` table. All the data in the column will be lost.
  - Added the required column `buyerEmail` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey (IF EXISTS — Render DB was seeded via db push and may not have these constraints)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Venue" DROP CONSTRAINT IF EXISTS "Venue_tenantId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "userId";
-- Add nullable first so existing rows are not rejected, backfill them,
-- then tighten to NOT NULL so all future inserts must supply the value.
ALTER TABLE "Order" ADD COLUMN "buyerEmail" TEXT;
UPDATE "Order" SET "buyerEmail" = '' WHERE "buyerEmail" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "buyerEmail" SET NOT NULL;

-- AlterTable
ALTER TABLE "Venue" DROP COLUMN "tenantId";
