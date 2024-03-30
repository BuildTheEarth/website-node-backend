-- CreateTable
CREATE TABLE "ApplicationResponseTemplate" (
    "id" TEXT NOT NULL,
    "buildteamId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "ApplicationResponseTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApplicationResponseTemplate" ADD CONSTRAINT "ApplicationResponseTemplate_buildteamId_fkey" FOREIGN KEY ("buildteamId") REFERENCES "BuildTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
