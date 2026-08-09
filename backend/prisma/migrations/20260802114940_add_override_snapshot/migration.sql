-- DropForeignKey
ALTER TABLE "AttendanceOverride" DROP CONSTRAINT "AttendanceOverride_attendanceId_fkey";

-- AlterTable
ALTER TABLE "AttendanceOverride" ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'check_in',
ALTER COLUMN "attendanceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AttendanceOverride" ADD CONSTRAINT "AttendanceOverride_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
