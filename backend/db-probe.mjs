import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const t = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 8000);
try {
  const c = await p.user.count();
  clearTimeout(t);
  console.log('DB OK - user count:', c);
} catch (e) {
  clearTimeout(t);
  console.log('DB ERROR:', String(e.message).slice(0, 300));
}
await p.$disconnect().catch(() => {});
process.exit(0);