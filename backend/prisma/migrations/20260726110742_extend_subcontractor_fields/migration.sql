-- AlterTable
ALTER TABLE "Subcontractor" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "joinDate" TIMESTAMP(3),
ADD COLUMN     "marginType" TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN     "marginValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "workType" TEXT NOT NULL DEFAULT '';
