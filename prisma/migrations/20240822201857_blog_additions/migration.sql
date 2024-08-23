/*
  Warnings:

  - Added the required column `summary` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailId` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "thumbnailId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
