import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const rows = await p.project.findMany({ select: { id: true, code: true, name: true, status: true } });
  for (const r of rows) console.log(JSON.stringify(r));
  await p.$disconnect();
})();
