-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "changeNumber" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "originalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "changeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "newAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "requestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeOrder_projectId_idx" ON "ChangeOrder"("projectId");

-- CreateIndex
CREATE INDEX "ChangeOrder_status_idx" ON "ChangeOrder"("status");

-- CreateIndex
CREATE INDEX "ChangeOrder_projectId_deletedAt_idx" ON "ChangeOrder"("projectId", "deletedAt");

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
