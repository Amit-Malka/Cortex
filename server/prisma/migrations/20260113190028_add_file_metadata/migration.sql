-- AlterTable
ALTER TABLE "files" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastModifierName" TEXT;
