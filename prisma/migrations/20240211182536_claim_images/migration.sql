-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_claimId_fkey";

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "claimId" TEXT;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
