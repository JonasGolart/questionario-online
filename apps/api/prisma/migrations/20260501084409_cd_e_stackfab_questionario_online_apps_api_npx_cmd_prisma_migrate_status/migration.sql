-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'ESSAY');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctAnswers" TEXT[],
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
ALTER COLUMN "options" DROP NOT NULL,
ALTER COLUMN "correctAnswer" DROP NOT NULL;
