import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = [
    ['projects', prisma.project.count()],
    ['buildings', prisma.building.count()],
    ['employerBoqItems', prisma.employerBoqItem.count()],
    ['analyticalBoqItems', prisma.analyticalBoqItem.count()],
    ['finalBoqs', prisma.finalBoq.count()],
    ['finalBoqItems', prisma.finalBoqItem.count()],
    ['components', prisma.component.count()],
    ['contractorBoqs', prisma.contractorBoq.count()],
    ['contractorBoqItems', prisma.contractorBoqItem.count()],
    ['statements', prisma.statement.count()],
    ['statementItems', prisma.statementItem.count()],
    ['payments', prisma.payment.count()],
    ['purchases', prisma.purchase.count()],
    ['miscellaneous', prisma.miscellaneous.count()],
    ['funds', prisma.projectFund.count()],
    ['fundTransactions', prisma.fundTransaction.count()],
    ['inventoryItems', prisma.inventoryItem.count()],
    ['stockMovements', prisma.stockMovement.count()],
    ['employees', prisma.employee.count()],
    ['attendance', prisma.attendance.count()],
    ['subcontractors', prisma.subcontractor.count()],
    ['suppliers', prisma.supplier.count()],
    ['clients', prisma.client.count()],
    ['clientStatements', prisma.clientStatement.count()],
    ['subcontractorStatements', prisma.subcontractorStatement.count()],
    ['departments', prisma.department.count()],
    ['warehouses', prisma.warehouse.count()],
    ['categories', prisma.category.count()],
    ['approvals', prisma.approval.count()],
  ] as const;

  for (const [name, promise] of models) {
    const count = await promise;
    console.log(`${name}: ${count}`);
  }

  console.log('\nProjects:');
  const projects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, status: true, progress: true, deletedAt: true },
  });
  for (const p of projects) {
    const buildings = await prisma.building.count({ where: { projectId: p.id, deletedAt: null } });
    const employer = await prisma.employerBoqItem.count({ where: { building: { projectId: p.id } } });
    const statements = await prisma.statement.count({ where: { contractorBoq: { building: { projectId: p.id } } } });
    console.log(`${p.code} | ${p.name} | status=${p.status} prog=${p.progress} del=${!!p.deletedAt} | buildings=${buildings} employer=${employer} statements=${statements}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
