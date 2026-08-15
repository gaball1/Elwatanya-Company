-- AlterTable: record reason for stock movements (سبب العملية)
ALTER TABLE "StockMovement" ADD COLUMN "reason" TEXT NOT NULL DEFAULT '';

-- AlterTable: warehouse names must be globally unique
CREATE UNIQUE INDEX "Warehouse_name_key" ON "Warehouse"("name");
