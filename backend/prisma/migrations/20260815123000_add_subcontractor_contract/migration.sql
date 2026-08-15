-- CreateTable
CREATE TABLE "SubcontractorContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "terms" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubcontractorContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubcontractorContract_buildingId_idx" ON "SubcontractorContract"("buildingId");

-- CreateIndex
CREATE INDEX "SubcontractorContract_subcontractorId_idx" ON "SubcontractorContract"("subcontractorId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractorContract_contractNumber_key" ON "SubcontractorContract"("contractNumber");

-- AddForeignKey
ALTER TABLE "SubcontractorContract" ADD CONSTRAINT "SubcontractorContract_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractorContract" ADD CONSTRAINT "SubcontractorContract_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
