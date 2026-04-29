/*
  Warnings:

  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Venue` table. All the data in the column will be lost.
  - Added the required column `buyerEmail` to the `Order` table without a default value. This is not possible if the table is not empty.

*/

-- DropForeignKey — IF EXISTS because the Render DB was originally created via
-- db push and these constraints may already be absent.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Venue" DROP CONSTRAINT IF EXISTS "Venue_tenantId_fkey";

-- Drop columns IF EXISTS for the same reason.
ALTER TABLE "Order" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Venue" DROP COLUMN IF EXISTS "tenantId";

-- Add buyerEmail only if it does not already exist (re-entrant safety).
-- Add nullable first so any existing rows are accepted, backfill them,
-- then tighten to NOT NULL so all future inserts must supply the value.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "buyerEmail" TEXT;
UPDATE "Order" SET "buyerEmail" = '' WHERE "buyerEmail" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "buyerEmail" SET NOT NULL;
