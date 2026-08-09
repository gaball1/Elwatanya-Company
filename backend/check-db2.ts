const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Check admin role assignments
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@elwataniya.com' } });
  console.log('admin@elwataniya.com user:', JSON.stringify(adminUser, null, 2));

  if (adminUser) {
    const ura = await prisma.userRoleAssignment.findMany({
      where: { userId: adminUser.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    console.log('Role assignments for admin:');
    for (const a of ura) {
      console.log('  Role:', a.role.name, 'Permissions:', a.role.permissions.map(p => p.permission.name).join(', '));
    }

    // The user's permissions from assignment
    const perms = await prisma.userRoleAssignment.findMany({
      where: { userId: adminUser.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    const permNames = new Set<string>();
    for (const a of perms) {
      for (const rp of a.role.permissions) {
        permNames.add(rp.permission.name);
      }
    }
    console.log(`Admin user has ${permNames.size} unique permissions`);
    console.log('Sample permissions:', [...permNames].slice(0, 10).join(', '));
  }

  // Check what role was assigned to which user
  const allAssignments = await prisma.userRoleAssignment.findMany({
    include: { user: { select: { email: true, name: true, role: true } }, role: { select: { name: true } } }
  });
  console.log('\nAll role assignments:');
  for (const a of allAssignments) {
    console.log(`  User: ${a.user.email} (${a.user.role}) -> Role: ${a.role.name}`);
  }

  // Check the Administrator role specifically
  const adminRole = await prisma.role.findFirst({ where: { name: 'Administrator' } });
  console.log('\nAdministrator role:', JSON.stringify(adminRole, null, 2));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
