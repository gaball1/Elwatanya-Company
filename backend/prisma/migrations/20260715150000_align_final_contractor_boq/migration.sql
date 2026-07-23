-- Align Final BOQ / Component / Contractor BOQ columns with current Prisma schema
-- (interrupted schema changes from previous agent)

-- FinalBoqItem: unit, totalValue, itemStatus
ALTER TABLE "FinalBoqItem" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FinalBoqItem" ADD COLUMN IF NOT EXISTS "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinalBoqItem" ADD COLUMN IF NOT EXISTS "itemStatus" TEXT NOT NULL DEFAULT 'pending';

-- Component: unit, totalValue
ALTER TABLE "Component" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Component" ADD COLUMN IF NOT EXISTS "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- ContractorBoq: buildingId, workType (if missing from interrupted migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ContractorBoq' AND column_name = 'buildingId'
  ) THEN
    ALTER TABLE "ContractorBoq" ADD COLUMN "buildingId" TEXT;
    -- Temporary placeholder; real FKs require existing buildings
    UPDATE "ContractorBoq" SET "buildingId" = (
      SELECT "id" FROM "Building" LIMIT 1
    ) WHERE "buildingId" IS NULL;
    ALTER TABLE "ContractorBoq" ALTER COLUMN "buildingId" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "ContractorBoq" ADD COLUMN IF NOT EXISTS "workType" TEXT;

-- ContractorBoqItem: itemCode, unit, assignedQuantity, totalValue, finalItemId, componentId
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "itemCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "assignedQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "finalItemId" TEXT;
ALTER TABLE "ContractorBoqItem" ADD COLUMN IF NOT EXISTS "componentId" TEXT;

-- BuildingSubcontractor table (if not created)
CREATE TABLE IF NOT EXISTS "BuildingSubcontractor" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "agreedPrice" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuildingSubcontractor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuildingSubcontractor_buildingId_subcontractorId_key"
  ON "BuildingSubcontractor"("buildingId", "subcontractorId");
CREATE INDEX IF NOT EXISTS "BuildingSubcontractor_buildingId_idx"
  ON "BuildingSubcontractor"("buildingId");

CREATE UNIQUE INDEX IF NOT EXISTS "ContractorBoq_buildingId_subcontractorId_key"
  ON "ContractorBoq"("buildingId", "subcontractorId");
CREATE INDEX IF NOT EXISTS "ContractorBoq_buildingId_idx"
  ON "ContractorBoq"("buildingId");

CREATE UNIQUE INDEX IF NOT EXISTS "ContractorBoqItem_contractorBoqId_itemCode_componentId_key"
  ON "ContractorBoqItem"("contractorBoqId", "itemCode", "componentId");
CREATE INDEX IF NOT EXISTS "ContractorBoqItem_contractorBoqId_idx"
  ON "ContractorBoqItem"("contractorBoqId");

-- FKs (safe if already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ContractorBoq_buildingId_fkey'
  ) THEN
    ALTER TABLE "ContractorBoq"
      ADD CONSTRAINT "ContractorBoq_buildingId_fkey"
      FOREIGN KEY ("buildingId") REFERENCES "Building"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ContractorBoqItem_componentId_fkey'
  ) THEN
    ALTER TABLE "ContractorBoqItem"
      ADD CONSTRAINT "ContractorBoqItem_componentId_fkey"
      FOREIGN KEY ("componentId") REFERENCES "Component"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BuildingSubcontractor_buildingId_fkey'
  ) THEN
    ALTER TABLE "BuildingSubcontractor"
      ADD CONSTRAINT "BuildingSubcontractor_buildingId_fkey"
      FOREIGN KEY ("buildingId") REFERENCES "Building"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BuildingSubcontractor_subcontractorId_fkey'
  ) THEN
    ALTER TABLE "BuildingSubcontractor"
      ADD CONSTRAINT "BuildingSubcontractor_subcontractorId_fkey"
      FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
