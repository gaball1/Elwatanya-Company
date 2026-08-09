const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const p = new PrismaClient();

async function main() {
  const u = await p.user.findFirst({ where: { email: 'admin@elwataniya.com' } });
  console.log('User:', u?.email, 'Role:', u?.role);
  console.log('PasswordHash:', u?.passwordHash);

  const match = await bcrypt.compare('password', u?.passwordHash || '');
  console.log('Password "password" matches:', match);

  const match2 = await bcrypt.compare('admin123', u?.passwordHash || '');
  console.log('Password "admin123" matches:', match2);

  // Check what users exist
  const users = await p.user.findMany({ take: 5, select: { email: true, role: true } });
  console.log('Users:', JSON.stringify(users));

  await p.$disconnect();
}
main().catch(console.error);
