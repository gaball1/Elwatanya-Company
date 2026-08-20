/*
  Warnings:

  - You are about to alter the column `totalWorkValue` on the `ClientStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalDeductions` on the `ClientStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `netPayable` on the `ClientStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `insurancePercent` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalWorkValue` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalInsurance` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `totalDeductions` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `previousPaid` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `netPayable` on the `SubcontractorStatement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.

*/
-- AlterTable
ALTER TABLE "ClientStatement" ALTER COLUMN "totalWorkValue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalDeductions" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "netPayable" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SubcontractorStatement" ALTER COLUMN "insurancePercent" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalWorkValue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalInsurance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "totalDeductions" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "previousPaid" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "netPayable" SET DATA TYPE DECIMAL(12,2);
