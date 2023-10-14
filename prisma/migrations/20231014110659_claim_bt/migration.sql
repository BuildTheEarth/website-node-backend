/*
  Warnings:

  - Added the required column `buildTeamId` to the `Claim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "buildTeamId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_buildTeamId_fkey" FOREIGN KEY ("buildTeamId") REFERENCES "BuildTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
