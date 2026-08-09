-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_requestedBy_idx" ON "Approval"("requestedBy");

-- CreateIndex
CREATE INDEX "Approval_approvedBy_idx" ON "Approval"("approvedBy");

-- CreateIndex
CREATE INDEX "Approval_entityType_idx" ON "Approval"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_entityType_entityId_key" ON "Approval"("entityType", "entityId");
