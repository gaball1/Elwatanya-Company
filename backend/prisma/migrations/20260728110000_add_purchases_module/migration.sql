CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buildingId" TEXT,
    "supplierId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "invoiceFile" TEXT,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Purchase_projectId_idx" ON "Purchase"("projectId");
CREATE INDEX IF NOT EXISTS "Purchase_supplierId_idx" ON "Purchase"("supplierId");
CREATE INDEX IF NOT EXISTS "Purchase_status_idx" ON "Purchase"("status");
CREATE INDEX IF NOT EXISTS "Purchase_date_idx" ON "Purchase"("date");
