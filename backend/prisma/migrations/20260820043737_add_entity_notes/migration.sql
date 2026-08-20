-- CreateTable
CREATE TABLE "EntityNote" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EntityNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityNote_entityType_entityId_idx" ON "EntityNote"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EntityNote_userId_idx" ON "EntityNote"("userId");

-- AddForeignKey
ALTER TABLE "EntityNote" ADD CONSTRAINT "EntityNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
