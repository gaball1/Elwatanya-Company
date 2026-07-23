-- CreateTable
CREATE TABLE "AnalyticalBoqItem" (
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

    CONSTRAINT "AnalyticalBoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticalBoqItem_buildingId_idx" ON "AnalyticalBoqItem"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticalBoqItem_buildingId_itemCode_key" ON "AnalyticalBoqItem"("buildingId", "itemCode");

-- AddForeignKey
ALTER TABLE "AnalyticalBoqItem" ADD CONSTRAINT "AnalyticalBoqItem_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
