-- Backfill purchase + company permission tokens that were referenced by
-- role definitions and frontend <Can> gates but never seeded.

-- Insert missing permissions (upsert semantics so re-running is safe).
INSERT INTO "Permission" (id, name, description, "createdAt", "updatedAt")
SELECT
  lower(md5(random()::text || clock_timestamp()::text))::uuid AS id,
  v.name,
  v.description,
  now(),
  now()
FROM (
  VALUES
    ('purchases.read', 'View purchase orders'),
    ('purchases.create', 'Create purchase orders'),
    ('purchases.update', 'Update purchase orders'),
    ('purchases.delete', 'Delete purchase orders'),
    ('company.write', 'Update company settings')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p.name = v.name);

-- Grant the new permissions to SUPER_ADMIN
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name IN ('purchases.read','purchases.create','purchases.update','purchases.delete','company.write')
WHERE r.name = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );

-- PROCUREMENT: purchase read/create/update (matching seed role map)
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name IN ('purchases.read','purchases.create','purchases.update')
WHERE r.name = 'PROCUREMENT'
AND NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp
  WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
);

-- ACCOUNTANT: purchase read (matching seed role map)
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, now()
FROM "Role" r
JOIN "Permission" p ON p.name = 'purchases.read'
WHERE r.name = 'ACCOUNTANT'
AND NOT EXISTS (
  SELECT 1 FROM "RolePermission" rp
  WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
);