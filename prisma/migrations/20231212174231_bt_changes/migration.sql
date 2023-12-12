-- AlterTable
ALTER TABLE "BuildTeam" ADD COLUMN     "allowBuilderClaim" BOOLEAN DEFAULT true,
ADD COLUMN     "instantAccept" BOOLEAN DEFAULT false;
