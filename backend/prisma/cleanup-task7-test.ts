import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const labels = await prisma.statement.findMany({
    where: { deletedAt: null, label: { in: ['TASK7 RUN 7', 'TASK7 EDITED', 'DUP', 'JUMP', 'ZERO'] } },
    select: { id: true, label: true, runningNumber: true },
  });
  for (const r of labels) {
    await prisma.statement.update({ where: { id: r.id }, data: { deletedAt: new Date() } });
    console.log('soft-deleted:', r.id.slice(0, 8), r.label);
  }
  const remains = await prisma.statement.count({ where: { contractorBoqId: '2cb67849-3ab1-4b82-99a0-9385b86481c6', deletedAt: null } });
  console.log('remaining:', remains);
  await prisma.$disconnect();
})();