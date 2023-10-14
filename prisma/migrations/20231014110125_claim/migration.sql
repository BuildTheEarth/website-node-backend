/*
  Warnings:

  - You are about to drop the `Build` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Build" DROP CONSTRAINT "Build_buildTeamId_fkey";

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "finished" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Build";
