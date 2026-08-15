-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "targetPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
