-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_statementId_fkey";

-- AlterTable
ALTER TABLE "Component" ALTER COLUMN "lifecycleStatus" SET DEFAULT 'pending',
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "totalValue" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ContractorBoqItem" ALTER COLUMN "itemCode" DROP DEFAULT,
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "assignedQuantity" DROP DEFAULT,
ALTER COLUMN "totalValue" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FinalBoqItem" ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "totalValue" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StatementItem" ALTER COLUMN "itemCode" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
