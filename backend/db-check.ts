import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Check admin user role assignments
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@elwataniya.com' },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!admin) { console.log('ADMIN NOT FOUND'); return; }
  console.log('Admin role:', admin.role, 'email:', admin.email);
  console.log('Role assignments:', admin.roleAssignments.length);
  for (const ra of admin.roleAssignments) {
    console.log(`  Role: ${ra.role.name} (${ra.roleId})`);
    console.log(`  Permissions: ${ra.role.permissions.length}`);
    for (const rp of ra.role.permissions.slice(0, 5)) {
      console.log(`    - ${rp.permission.name}`);
    }
    if (ra.role.permissions.length > 5) console.log(`    ... and ${ra.role.permissions.length - 5} more`);
  }
  // Collect all permissions
  const perms = new Set<string>();
  for (const ra of admin.roleAssignments) {
    for (const rp of ra.role.permissions) {
      perms.add(rp.permission.name);
    }
  }
  console.log('\nTotal unique permissions:', perms.size);
  console.log('Has projects.read:', perms.has('projects.read'));
  console.log('Has buildings.read:', perms.has('buildings.read'));
  await prisma.$disconnect();
}
main().catch(console.error);
