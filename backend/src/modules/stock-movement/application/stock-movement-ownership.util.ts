import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

/**
 * Verifies that the actor may access every project touched by a stock movement:
 * the project owning each inventory item plus the projects owning the source and
 * destination warehouses. Resolves an item's project through its warehouse when
 * the item has no direct project link.
 */
export async function verifyStockMovementAccess(
  prisma: PrismaService,
  ownership: OwnershipService,
  user: OwnershipActor | undefined,
  itemIds: (string | null | undefined)[],
  warehouseIds: (string | null | undefined)[],
): Promise<void> {
  const uniqueItems = [...new Set(itemIds.filter((id): id is string => !!id))];
  if (uniqueItems.length) {
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: uniqueItems } },
      select: { projectId: true, warehouseId: true },
    });
    for (const item of items) {
      if (item.projectId) {
        await ownership.verifyProjectAccess(user, item.projectId);
      } else if (item.warehouseId) {
        warehouseIds.push(item.warehouseId);
      }
    }
  }

  const uniqueWarehouses = [...new Set(warehouseIds.filter((id): id is string => !!id))];
  if (uniqueWarehouses.length) {
    const warehouses = await prisma.warehouse.findMany({
      where: { id: { in: uniqueWarehouses } },
      select: { projectId: true },
    });
    for (const w of warehouses) {
      if (w.projectId) await ownership.verifyProjectAccess(user, w.projectId);
    }
  }
}
