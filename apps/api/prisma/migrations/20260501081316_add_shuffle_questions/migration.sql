-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false;
