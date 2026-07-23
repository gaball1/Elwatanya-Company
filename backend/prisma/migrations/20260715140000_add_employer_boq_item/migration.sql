-- CreateTable
CREATE TABLE "EmployerBoqItem" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalValue" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerBoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployerBoqItem_buildingId_idx" ON "EmployerBoqItem"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerBoqItem_buildingId_itemCode_key" ON "EmployerBoqItem"("buildingId", "itemCode");

-- AddForeignKey
ALTER TABLE "EmployerBoqItem" ADD CONSTRAINT "EmployerBoqItem_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
