-- CreateTable
CREATE TABLE "ClientStatement" (
    "id" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "buildingId" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalWorkValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "signatures" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractorStatement" (
    "id" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "buildingId" TEXT NOT NULL,
    "buildingName" TEXT NOT NULL DEFAULT '',
    "subcontractorId" TEXT NOT NULL,
    "subcontractorName" TEXT NOT NULL DEFAULT '',
    "workType" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "blockNumber" TEXT NOT NULL DEFAULT '',
    "formNumber" TEXT NOT NULL DEFAULT '',
    "insurancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWorkValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runningNumber" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "signatures" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubcontractorStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientStatement_projectId_idx" ON "ClientStatement"("projectId");

-- CreateIndex
CREATE INDEX "ClientStatement_clientId_idx" ON "ClientStatement"("clientId");

-- CreateIndex
CREATE INDEX "ClientStatement_status_idx" ON "ClientStatement"("status");

-- CreateIndex
CREATE INDEX "SubcontractorStatement_projectId_idx" ON "SubcontractorStatement"("projectId");

-- CreateIndex
CREATE INDEX "SubcontractorStatement_subcontractorId_idx" ON "SubcontractorStatement"("subcontractorId");

-- CreateIndex
CREATE INDEX "SubcontractorStatement_status_idx" ON "SubcontractorStatement"("status");
