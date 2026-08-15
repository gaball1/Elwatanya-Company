-- CreateIndex
CREATE INDEX "AttendanceOverride_employeeId_idx" ON "AttendanceOverride"("employeeId");

-- AddForeignKey
ALTER TABLE "AttendanceOverride" ADD CONSTRAINT "AttendanceOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
