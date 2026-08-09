const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const perms = await p.permission.findMany({ take: 100, orderBy: { name: 'asc' } });
  console.log('=== ALL PERMISSIONS IN DB ===');
  for (const perm of perms) {
    console.log('  ' + perm.name);
  }
  await p.$disconnect();
}
main().catch(console.error);
