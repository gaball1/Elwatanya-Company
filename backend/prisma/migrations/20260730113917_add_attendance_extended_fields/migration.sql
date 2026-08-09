-- DropIndex
DROP INDEX "Attendance_status_idx";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "attendanceStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "buildingId" TEXT,
ADD COLUMN     "checkInAccuracy" DOUBLE PRECISION,
ADD COLUMN     "checkInAddress" TEXT,
ADD COLUMN     "checkInLatitude" DECIMAL(10,7),
ADD COLUMN     "checkInLongitude" DECIMAL(10,7),
ADD COLUMN     "checkInSelfie" TEXT,
ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "checkOutAccuracy" DOUBLE PRECISION,
ADD COLUMN     "checkOutAddress" TEXT,
ADD COLUMN     "checkOutLatitude" DECIMAL(10,7),
ADD COLUMN     "checkOutLongitude" DECIMAL(10,7),
ADD COLUMN     "checkOutSelfie" TEXT,
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "distanceFromSite" DOUBLE PRECISION,
ADD COLUMN     "isSynced" BOOLEAN DEFAULT true,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "workedMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Attendance_attendanceStatus_idx" ON "Attendance"("attendanceStatus");

-- CreateIndex
CREATE INDEX "Attendance_projectId_idx" ON "Attendance"("projectId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;
