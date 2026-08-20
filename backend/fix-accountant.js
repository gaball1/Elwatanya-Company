const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const role = await prisma.role.findUnique({ where: { name: 'ACCOUNTANT' } });
  if (!role) { console.log('ACCOUNTANT role not found'); return; }

  const newPerms = ['projects.read', 'buildings.read', 'settings.read'];
  const permRecords = await prisma.permission.findMany({ where: { name: { in: newPerms } } });
  console.log('Found permissions:', permRecords.map(p => p.name));

  const existing = await prisma.rolePermission.findMany({
    where: { roleId: role.id, permissionId: { in: permRecords.map(p => p.id) } },
  });
  console.log('Already assigned:', existing.length);

  const toInsert = permRecords.filter(p => !existing.some(e => e.permissionId === p.id));
  console.log('To insert:', toInsert.length);

  if (toInsert.length > 0) {
    await prisma.rolePermission.createMany({
      data: toInsert.map(p => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log('Done! Added:', toInsert.map(p => p.name));
  }

  const finalPerms = await prisma.rolePermission.findMany({
    where: { roleId: role.id },
    include: { permission: true },
  });
  console.log('ACCOUNTANT total permissions:', finalPerms.length);
  console.log('Has projects.read:', finalPerms.some(fp => fp.permission.name === 'projects.read'));
  console.log('Has buildings.read:', finalPerms.some(fp => fp.permission.name === 'buildings.read'));
  console.log('Has settings.read:', finalPerms.some(fp => fp.permission.name === 'settings.read'));

  await prisma.$disconnect();
})();
