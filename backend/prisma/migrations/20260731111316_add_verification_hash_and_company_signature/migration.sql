-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "signature" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "verificationHash" TEXT;

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "Document"("documentNumber");
