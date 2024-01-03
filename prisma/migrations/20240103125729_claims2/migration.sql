-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_ownerId_fkey";

-- AlterTable
ALTER TABLE "Claim" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
