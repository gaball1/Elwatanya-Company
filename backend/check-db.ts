const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { deletedAt: null }, take: 10, select: { id: true, name: true, role: true, email: true } });
  console.log('=== USERS ===');
  console.log(JSON.stringify(users, null, 2));

  console.log('Roles count:', await prisma.role.count());
  console.log('Permissions count:', await prisma.permission.count());
  console.log('RolePermission count:', await prisma.rolePermission.count());
  console.log('UserRoleAssignment count:', await prisma.userRoleAssignment.count());

  const adminUser = await prisma.user.findFirst({ where: { role: 'CEO' }, select: { id: true, name: true, role: true, email: true } });
  console.log('Admin user:', JSON.stringify(adminUser, null, 2));

  if (adminUser) {
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: adminUser.id },
      include: { role: { include: { permissions: true } } }
    });
    for (const a of assignments) {
      console.log('  Assignment - roleId:', a.roleId, 'roleName:', a.role.name, 'permCount:', a.role.permissions.length);
    }
  }

  // Check someone who tried to register
  const anyUser = await prisma.user.findFirst({ where: { deletedAt: null, role: { not: 'CEO' } }, select: { id: true, name: true, role: true } });
  console.log('Any non-CEO user:', JSON.stringify(anyUser, null, 2));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
