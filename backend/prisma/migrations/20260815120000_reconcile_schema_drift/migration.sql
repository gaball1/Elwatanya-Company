-- Reconcile schema drift between the migration history and the actual database.
-- These changes were previously applied directly to the database without a
-- migration. Every statement is guarded (IF NOT EXISTS) so this migration is
-- safe on the existing database (no-ops) and on freshly created databases
-- (applies the missing schema so it matches prisma/schema.prisma).

-- InventoryItem: project-scoped, warehouse-scoped uniqueness
DROP INDEX IF EXISTS "InventoryItem_code_key";
DROP INDEX IF EXISTS "InventoryItem_nameNorm_idx";
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "InventoryItem_projectId_idx" ON "InventoryItem"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_code_warehouseId_key" ON "InventoryItem"("code", "warehouseId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_nameNorm_warehouseId_key" ON "InventoryItem"("nameNorm", "warehouseId");

-- Project: status index
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

-- ProjectFund: petty cash balance
ALTER TABLE "ProjectFund" ADD COLUMN IF NOT EXISTS "pettyCashBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Purchase: destination warehouse
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
CREATE INDEX IF NOT EXISTS "Purchase_warehouseId_idx" ON "Purchase"("warehouseId");

-- Warehouse: project-scoped
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "Warehouse_projectId_idx" ON "Warehouse"("projectId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Warehouse_projectId_fkey') THEN
    ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_projectId_fkey') THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Purchase_warehouseId_fkey') THEN
    ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
