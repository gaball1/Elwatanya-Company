import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockMovementType } from '../domain/stock-movement.entity';

export class StockEffectError extends Error {}

export interface StockEffectInput {
  type: StockMovementType;
  itemId: string;
  quantity: number;
  fromWarehouse?: string;
  toWarehouse?: string;
}

/**
 * Applies the on-hand quantity effect of a stock movement inside a Prisma
 * transaction. ISSUE deducts (guarding against insufficient stock), RECEIVE
 * increases, and TRANSFER moves quantity between the source item and the item
 * with the same code in the destination warehouse.
 */
@Injectable()
export class StockEffectService {
  async applyCreate(tx: Prisma.TransactionClient, input: StockEffectInput): Promise<void> {
    const qty = new Prisma.Decimal(input.quantity);
    switch (input.type) {
      case 'ISSUE':
        return this.deduct(tx, input.itemId, qty);
      case 'RECEIVE':
        return this.add(tx, input.itemId, qty);
      case 'TRANSFER':
        return this.transfer(tx, input.itemId, qty, input.fromWarehouse, input.toWarehouse);
    }
  }

  async reverse(tx: Prisma.TransactionClient, input: StockEffectInput): Promise<void> {
    const qty = new Prisma.Decimal(input.quantity);
    switch (input.type) {
      case 'ISSUE':
        return this.add(tx, input.itemId, qty);
      case 'RECEIVE':
        return this.deduct(tx, input.itemId, qty);
      case 'TRANSFER':
        return this.transferBack(tx, input.itemId, qty, input.toWarehouse);
    }
  }

  private async findItem(tx: Prisma.TransactionClient, id: string): Promise<{ id: string; code: string; quantity: Prisma.Decimal }> {
    const item = await tx.inventoryItem.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new StockEffectError('Inventory item not found');
    return { id: item.id, code: item.code, quantity: new Prisma.Decimal(item.quantity) };
  }

  private async deduct(tx: Prisma.TransactionClient, id: string, qty: Prisma.Decimal): Promise<void> {
    const item = await this.findItem(tx, id);
    if (item.quantity.lt(qty)) {
      throw new StockEffectError('Insufficient stock');
    }
    await tx.inventoryItem.update({
      where: { id },
      data: { quantity: item.quantity.sub(qty), updatedAt: new Date() },
    });
  }

  private async add(tx: Prisma.TransactionClient, id: string, qty: Prisma.Decimal): Promise<void> {
    const item = await this.findItem(tx, id);
    await tx.inventoryItem.update({
      where: { id },
      data: { quantity: item.quantity.add(qty), updatedAt: new Date() },
    });
  }

  private async transfer(
    tx: Prisma.TransactionClient,
    sourceId: string,
    qty: Prisma.Decimal,
    fromWarehouse?: string,
    toWarehouse?: string,
  ): Promise<void> {
    const source = await this.findItem(tx, sourceId);
    if (source.quantity.lt(qty)) {
      throw new StockEffectError('Insufficient stock');
    }
    const target = await tx.inventoryItem.findFirst({
      where: { code: source.code, warehouseId: toWarehouse ?? '', deletedAt: null },
    });
    if (!target) {
      throw new StockEffectError('Target inventory item not found in destination warehouse');
    }
    await tx.inventoryItem.update({
      where: { id: source.id },
      data: { quantity: source.quantity.sub(qty), updatedAt: new Date() },
    });
    await tx.inventoryItem.update({
      where: { id: target.id },
      data: { quantity: new Prisma.Decimal(target.quantity).add(qty), updatedAt: new Date() },
    });
  }

  private async transferBack(
    tx: Prisma.TransactionClient,
    sourceId: string,
    qty: Prisma.Decimal,
    toWarehouse?: string,
  ): Promise<void> {
    const source = await this.findItem(tx, sourceId);
    const target = await tx.inventoryItem.findFirst({
      where: { code: source.code, warehouseId: toWarehouse ?? '', deletedAt: null },
    });
    if (!target) {
      throw new StockEffectError('Target inventory item not found in destination warehouse');
    }
    const targetQty = new Prisma.Decimal(target.quantity);
    if (targetQty.lt(qty)) {
      throw new StockEffectError('Insufficient stock in destination warehouse to reverse transfer');
    }
    await tx.inventoryItem.update({
      where: { id: target.id },
      data: { quantity: targetQty.sub(qty), updatedAt: new Date() },
    });
    await tx.inventoryItem.update({
      where: { id: source.id },
      data: { quantity: source.quantity.add(qty), updatedAt: new Date() },
    });
  }
}
