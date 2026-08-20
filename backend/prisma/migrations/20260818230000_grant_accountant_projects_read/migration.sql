-- Grant projects.read and buildings.read to ACCOUNTANT role
-- (matching seed.ts role map)

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name = 'projects.read'
WHERE r.name = 'ACCOUNTANT'
AND NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp
  WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
);

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name = 'buildings.read'
WHERE r.name = 'ACCOUNTANT'
AND NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp
  WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
);

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name = 'settings.read'
WHERE r.name = 'ACCOUNTANT'
AND NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp
  WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
);
