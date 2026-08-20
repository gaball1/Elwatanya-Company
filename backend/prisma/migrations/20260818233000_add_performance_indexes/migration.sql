-- Performance indexes for frequently queried foreign keys

CREATE INDEX IF NOT EXISTS "Building_projectId_idx" ON "Building"("projectId");
CREATE INDEX IF NOT EXISTS "FinalBoq_buildingId_idx" ON "FinalBoq"("buildingId");
CREATE INDEX IF NOT EXISTS "Statement_contractorBoqId_idx" ON "Statement"("contractorBoqId");
CREATE INDEX IF NOT EXISTS "Payment_buildingId_idx" ON "Payment"("buildingId");
CREATE INDEX IF NOT EXISTS "Payment_contractorId_idx" ON "Payment"("contractorId");
CREATE INDEX IF NOT EXISTS "Payment_statementId_idx" ON "Payment"("statementId");
CREATE INDEX IF NOT EXISTS "Distribution_finalBoqId_idx" ON "Distribution"("finalBoqId");
CREATE INDEX IF NOT EXISTS "DistributionRow_distributionId_idx" ON "DistributionRow"("distributionId");
CREATE INDEX IF NOT EXISTS "DistributionRow_finalBoqItemId_idx" ON "DistributionRow"("finalBoqItemId");
CREATE INDEX IF NOT EXISTS "DistributionRow_componentId_idx" ON "DistributionRow"("componentId");
CREATE INDEX IF NOT EXISTS "User_projectId_idx" ON "User"("projectId");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "Attendance_buildingId_idx" ON "Attendance"("buildingId");
CREATE INDEX IF NOT EXISTS "BuildingSubcontractor_subcontractorId_idx" ON "BuildingSubcontractor"("subcontractorId");
CREATE INDEX IF NOT EXISTS "ContractorBoq_subcontractorId_idx" ON "ContractorBoq"("subcontractorId");
