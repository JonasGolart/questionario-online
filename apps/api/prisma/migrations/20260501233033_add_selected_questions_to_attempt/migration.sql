-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "selectedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
