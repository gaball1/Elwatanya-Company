/**
 * Inventory maintenance script (run once after the dedupe migration):
 *
 * 1. Backfills `nameNorm` for any inventory items that predate the column.
 * 2. Identifies duplicate names within the same category (Arabic/case-insensitive).
 * 3. For each duplicate group, merges the duplicates into the canonical item:
 *    - sums on-hand quantity and weighted average cost,
 *    - re-points their stock movements and linked purchases to the canonical item,
 *    - soft-deletes the merged duplicates.
 *
 * Safe/idempotent: re-running converges (no duplicates remain after first run).
 *
 * Usage: npx ts-node -e "import('./prisma/maintain-inventory')"
 */
import { PrismaClient } from '@prisma/client';
import { normalizeKey } from '../src/shared/utils/string-normalizer';

async function run() {
  const prisma = new PrismaClient();

  const items = await prisma.inventoryItem.findMany({ where: { deletedAt: null } });

  // 1. Backfill nameNorm.
  let backfilled = 0;
  for (const item of items) {
    if (!item.nameNorm) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { nameNorm: normalizeKey(item.name) },
      });
      backfilled++;
    }
  }
  console.log(`Backfilled nameNorm for ${backfilled} item(s)`);

  // 2. Group by (nameNorm, categoryId).
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.nameNorm}::${item.categoryId ?? ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  let merged = 0;
  let groupsFound = 0;

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    groupsFound++;

    const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const canonical = sorted[0];
    const duplicates = sorted.slice(1);

    // Merge quantities + weighted avg cost into the canonical item.
    let totalQty = Number(canonical.quantity);
    let totalValue = Number(canonical.quantity) * Number(canonical.avgCost || canonical.price);
    for (const dup of duplicates) {
      totalQty += Number(dup.quantity);
      totalValue += Number(dup.quantity) * Number(dup.avgCost || dup.price);
    }
    const newAvg = totalQty > 0 ? totalValue / totalQty : 0;

    for (const dup of duplicates) {
      // Re-point movement history.
      await prisma.stockMovement.updateMany({
        where: { itemId: dup.id },
        data: { itemId: canonical.id },
      });
      // Re-point linked purchases.
      await prisma.purchase.updateMany({
        where: { inventoryItemId: dup.id },
        data: { inventoryItemId: canonical.id },
      });
      // Soft-delete the duplicate item.
      await prisma.inventoryItem.update({
        where: { id: dup.id },
        data: { deletedAt: new Date(), status: 'inactive' },
      });
      merged++;
    }

    await prisma.inventoryItem.update({
      where: { id: canonical.id },
      data: { quantity: totalQty, avgCost: newAvg, nameNorm: canonical.nameNorm },
    });

    console.log(
      `Merged ${duplicates.length} duplicate(s) into "${canonical.name}" (qty now ${totalQty}) [group: ${canonical.nameNorm}/cat=${canonical.categoryId}]`,
    );
  }

  await prisma.$disconnect();
  console.log(`Done. ${groupsFound} duplicate group(s), ${merged} item(s) merged/removed.`);
}

function normalizeName(name: string): string {
  return normalizeKey(name);
}

void run();