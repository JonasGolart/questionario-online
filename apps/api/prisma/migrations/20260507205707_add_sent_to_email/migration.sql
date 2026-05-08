-- DropIndex
DROP INDEX "AccessToken_questionnaireId_status_idx";

-- AlterTable
ALTER TABLE "AccessToken" ADD COLUMN     "sentToEmail" TEXT;

-- CreateIndex
CREATE INDEX "AccessToken_questionnaireId_status_sentToEmail_idx" ON "AccessToken"("questionnaireId", "status", "sentToEmail");
