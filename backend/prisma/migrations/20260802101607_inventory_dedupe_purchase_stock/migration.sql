-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "avgCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "nameNorm" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "inventoryItemId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryItem_nameNorm_idx" ON "InventoryItem"("nameNorm");

-- CreateIndex
CREATE INDEX "Purchase_inventoryItemId_idx" ON "Purchase"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
