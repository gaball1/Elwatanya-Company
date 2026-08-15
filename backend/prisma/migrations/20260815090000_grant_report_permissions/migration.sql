-- Grant the reports.read / reports.generate permissions to internal staff roles
-- so the analytics, BI, and report screens keep working after the controllers
-- start enforcing @RequirePermission. Non-interactive roles (CONTRACTOR, CLIENT)
-- intentionally receive no report permissions.

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r, "Permission" p
WHERE p."name" = 'reports.read'
  AND r."name" IN ('TECHNICAL_OFFICE', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTANT', 'HR', 'STORE_KEEPER', 'PROCUREMENT', 'ATTENDANCE_OFFICER')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r, "Permission" p
WHERE p."name" = 'reports.generate'
  AND r."name" IN ('TECHNICAL_OFFICE', 'PROJECT_MANAGER', 'ACCOUNTANT')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
