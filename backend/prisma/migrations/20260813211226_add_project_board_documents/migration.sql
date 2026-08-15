-- CreateTable
CREATE TABLE "ProjectBoardDocument" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "fileId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectBoardDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectBoardDocument_boardId_idx" ON "ProjectBoardDocument"("boardId");

-- CreateIndex
CREATE INDEX "ProjectBoardDocument_fileId_idx" ON "ProjectBoardDocument"("fileId");

-- AddForeignKey
ALTER TABLE "ProjectBoardDocument" ADD CONSTRAINT "ProjectBoardDocument_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "ProjectBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
