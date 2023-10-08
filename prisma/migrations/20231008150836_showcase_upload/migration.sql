/*
  Warnings:

  - You are about to drop the column `image` on the `Showcase` table. All the data in the column will be lost.
  - Added the required column `uploadId` to the `Showcase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Showcase" DROP COLUMN "image",
ADD COLUMN     "uploadId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
