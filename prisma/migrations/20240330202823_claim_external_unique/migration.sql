/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Claim` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Claim_externalId_key" ON "Claim"("externalId");
