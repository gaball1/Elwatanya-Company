import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();

  const items = await prisma.inventoryItem.findMany({
    where: {
      deletedAt: null,
      OR: [
        { code: { startsWith: 'V6-' } },
        { code: { startsWith: 'MM-' } },
        { code: { startsWith: 'INV-' } },
        { name: { contains: 'AutoStockItem-' } },
        { name: { contains: 'Verify6' } },
        { name: { contains: 'MatchMe-' } },
      ],
    },
  });

  const purchases = await prisma.purchase.findMany({
    where: {
      deletedAt: null,
      OR: [
        { itemName: { contains: 'Verify6' } },
        { itemName: { contains: 'AutoStockItem-' } },
        { itemName: { contains: 'MatchMe-' } },
      ],
    },
  });

  const itemIds = items.map((i) => i.id);
  const purchaseIds = purchases.map((p) => p.id);

  await prisma.stockMovement.updateMany({
    where: { itemId: { in: itemIds } },
    data: { deletedAt: new Date() },
  });

  await prisma.purchase.updateMany({
    where: { id: { in: purchaseIds } },
    data: { deletedAt: new Date() },
  });

  await prisma.inventoryItem.updateMany({
    where: { id: { in: itemIds } },
    data: { deletedAt: new Date(), status: 'inactive' },
  });

  console.log(`Cleaned ${itemIds.length} inventory items, ${purchaseIds.length} purchases, and their movements.`);
  await prisma.$disconnect();
}

void run();