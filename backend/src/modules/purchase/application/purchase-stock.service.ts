import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { normalizeKey } from '@/shared/utils/string-normalizer';
import { randomBytes } from 'crypto';

export interface StockInContext {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  categoryId?: string;
  supplierName?: string;
  createdBy: string;
  date: Date;
  purchaseId: string;
}

/**
 * Links purchases to inventory on physical receipt (SAP/Dynamics-style workflow):
 * purchase request -> approval -> PO -> physical receipt -> RECEIVE stock movement
 * + on-hand quantity increase + average-cost valuation update.
 *
 * Matching rules:
 *  - explicit link (purchase.inventoryItemId) wins;
 *  - otherwise match by normalized name + category;
 *  - otherwise auto-create a new inventory item from the purchase data.
 */
@Injectable()
export class PurchaseStockService {
  constructor(private readonly prisma: PrismaService) {}

  async stockIn(ctx: StockInContext, tx: Prisma.TransactionClient): Promise<string> {
    const qty = new Prisma.Decimal(ctx.quantity);
    const unitCost = new Prisma.Decimal(ctx.unitPrice);

    // 1. Find or create the inventory item.
    let item = await this.findItemByName(ctx.itemName, ctx.categoryId, tx);
    if (!item) {
      item = await this.createItem(ctx, tx);
    }

    // 2. Update on-hand quantity + moving average cost.
    const oldQty = new Prisma.Decimal(item.quantity);
    const oldAvg = new Prisma.Decimal(item.avgCost);
    const newQty = oldQty.add(qty);
    const newAvg = newQty.isZero()
      ? unitCost
      : oldAvg.mul(oldQty).add(unitCost.mul(qty)).div(newQty);

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: newQty,
        avgCost: newAvg,
        price: unitCost,
        updatedAt: new Date(),
      },
    });

    // 3. Record the RECEIVE stock movement.
    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'RECEIVE',
        quantity: qty,
        date: ctx.date,
        reference: `GRN-${ctx.purchaseId.slice(0, 8)}`,
        notes: `استلام مشتريات: ${ctx.itemName}`,
        createdBy: ctx.createdBy,
        supplier: ctx.supplierName ?? '',
      },
    });

    return item.id;
  }

  async reverseStockIn(ctx: StockInContext, tx: Prisma.TransactionClient): Promise<void> {
    const qty = new Prisma.Decimal(ctx.quantity);

    // Resolve the linked item via the purchase record.
    const purchase = await tx.purchase.findUnique({
      where: { id: ctx.purchaseId },
      select: { inventoryItemId: true },
    });
    if (!purchase?.inventoryItemId) return; // never stocked, nothing to reverse

    const linked = await tx.inventoryItem.findFirst({
      where: { id: purchase.inventoryItemId, deletedAt: null },
    });
    if (!linked) return;

    const oldQty = new Prisma.Decimal(linked.quantity);
    const remaining = oldQty.sub(qty);

    await tx.inventoryItem.update({
      where: { id: linked.id },
      data: { quantity: remaining.lt(0) ? new Prisma.Decimal(0) : remaining },
    });

    await tx.stockMovement.create({
      data: {
        itemId: linked.id,
        type: 'ISSUE',
        quantity: qty,
        date: ctx.date,
        reference: `REV-${ctx.purchaseId.slice(0, 8)}`,
        notes: `إلغاء استلام مشتريات: ${ctx.itemName}`,
        createdBy: ctx.createdBy,
        supplier: ctx.supplierName ?? '',
      },
    });
  }

  private async findItemByName(
    name: string,
    categoryId: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const nameNorm = normalizeKey(name);
    return tx.inventoryItem.findFirst({
      where: {
        nameNorm,
        ...(categoryId ? { categoryId } : { categoryId: null }),
        deletedAt: null,
      },
    });
  }

  private async createItem(ctx: StockInContext, tx: Prisma.TransactionClient) {
    let code = `INV-${randomBytes(4).toString('hex').toUpperCase()}`;
    // Ensure globally-unique code even within a long-lived transaction.
    while (await tx.inventoryItem.findUnique({ where: { code } })) {
      code = `INV-${randomBytes(4).toString('hex').toUpperCase()}`;
    }

    return tx.inventoryItem.create({
      data: {
        code,
        name: ctx.itemName,
        nameNorm: normalizeKey(ctx.itemName),
        unit: ctx.unit,
        categoryId: ctx.categoryId ?? null,
        quantity: 0, // stock is applied by the caller (stockIn) so it is not double-counted
        price: ctx.unitPrice,
        avgCost: ctx.unitPrice,
        status: 'active',
      },
    });
  }
}