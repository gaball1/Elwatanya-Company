-- CreateTable for concurrency-safe Employer BOQ code generation
CREATE TABLE "BoqCodeCounter" (
    "buildingId" TEXT NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoqCodeCounter_pkey" PRIMARY KEY ("buildingId")
);

-- Seed existing buildings: next sequence = max(EMP-XXX numeric) + 1, or 1 if no items
INSERT INTO "BoqCodeCounter" ("buildingId", "nextSequence", "updatedAt")
SELECT 
  b.id,
  COALESCE(
    (SELECT MAX(CAST(REGEXP_REPLACE(e."itemCode", '^EMP-0*', '') AS INTEGER)) + 1
     FROM "EmployerBoqItem" e
     WHERE e."buildingId" = b.id
       AND e."itemCode" ~ '^EMP-\d+$'),
    1
  ),
  NOW()
FROM "Building" b
ON CONFLICT ("buildingId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "BoqCodeCounter" ADD CONSTRAINT "BoqCodeCounter_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
