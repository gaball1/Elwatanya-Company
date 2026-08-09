import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ROLES ===');
  const roles = await prisma.role.findMany({ include: { _count: { select: { permissions: true, users: true } } } });
  for (const r of roles) {
    console.log(`  ${r.name} (${r.id}): ${r._count.permissions} permissions, ${r._count.users} users`);
  }

  console.log('\n=== ADMIN USER ASSIGNMENTS ===');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@elwataniya.com' },
    include: {
      roleAssignments: {
        include: { role: { include: { _count: { select: { permissions: true } } } } },
      },
    },
  });
  if (admin) {
    console.log(`  User: ${admin.email}, role: ${admin.role}`);
    console.log(`  Assignments: ${admin.roleAssignments.length}`);
    for (const ra of admin.roleAssignments) {
      console.log(`    -> ${ra.role.name} (${ra.roleId}) - ${ra.role._count.permissions} permissions`);
    }
  } else {
    console.log('  ADMIN NOT FOUND');
  }

  console.log('\n=== PERMISSION COUNT ===');
  const permCount = await prisma.permission.count();
  console.log(`  Total permissions: ${permCount}`);

  console.log('\n=== PERMISSION NAMES (first 10) ===');
  const perms = await prisma.permission.findMany({ take: 10, orderBy: { name: 'asc' } });
  for (const p of perms) {
    console.log(`  ${p.id.substring(0,8)}... -> ${p.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
