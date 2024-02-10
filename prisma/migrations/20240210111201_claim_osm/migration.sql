-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "buildings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "osmName" TEXT;
