-- CreateTable
CREATE TABLE "MinecraftVerifications" (
    "code" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftVerifications_code_key" ON "MinecraftVerifications"("code");

-- AddForeignKey
ALTER TABLE "MinecraftVerifications" ADD CONSTRAINT "MinecraftVerifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
