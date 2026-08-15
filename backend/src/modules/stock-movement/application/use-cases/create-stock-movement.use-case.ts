import { Result } from '@/shared/kernel/result';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { CreateStockMovementInput, StockMovementResult } from '../dto/stock-movement.dto';
import { StockMovement } from '../../domain/stock-movement.entity';
import { toResult } from './list-stock-movements.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementCreatedEvent } from '@/modules/domain-events/events';
import { Prisma } from '@prisma/client';
import { StockEffectService } from '../stock-effect.service';

export class CreateStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
    private readonly stockEffect: StockEffectService,
  ) {}

  async execute(input: CreateStockMovementInput): Promise<Result<StockMovementResult>> {
    const result = StockMovement.create({
      itemId: input.itemId,
      type: input.type as StockMovement['type'],
      quantity: input.quantity,
      date: input.date,
      reference: input.reference,
      reason: input.reason,
      notes: input.notes,
      createdBy: input.createdBy,
      issuedTo: input.issuedTo,
      supplier: input.supplier,
      fromWarehouse: input.fromWarehouse,
      toWarehouse: input.toWarehouse,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const stockMovement = result.getValue();

    try {
      // Apply the quantity effect and persist the movement atomically so the
      // on-hand quantity can never drift from the recorded movement.
      await this.prisma.$transaction(async (tx) => {
        await this.stockEffect.applyCreate(tx, {
          type: stockMovement.type,
          itemId: stockMovement.itemId,
          quantity: stockMovement.quantity,
          fromWarehouse: stockMovement.fromWarehouse,
          toWarehouse: stockMovement.toWarehouse,
        });
        await tx.stockMovement.create({
          data: {
            id: stockMovement.id.toValue(),
            itemId: stockMovement.itemId,
            type: stockMovement.type,
            quantity: new Prisma.Decimal(stockMovement.quantity),
            date: stockMovement.date,
            reference: stockMovement.reference,
            reason: stockMovement.reason,
            notes: stockMovement.notes,
            createdBy: stockMovement.createdBy,
            issuedTo: stockMovement.issuedTo,
            supplier: stockMovement.supplier,
            fromWarehouse: stockMovement.fromWarehouse,
            toWarehouse: stockMovement.toWarehouse,
            deletedAt: null,
          },
        });
      });
    } catch (error: any) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }

    await this.eventBus.publish(
      new StockMovementCreatedEvent(
        stockMovement.id.toValue(),
        'stock_movement',
        {
          id: stockMovement.id.toValue(),
          itemId: input.itemId,
          type: input.type,
          quantity: input.quantity,
          createdBy: input.createdBy,
        },
      ),
    );

    if (input.type === 'ISSUE') {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { id: input.itemId },
      });
      if (item && item.quantity <= item.minQuantity) {
        const storeUsers = await this.prisma.user.findMany({
          where: { role: { in: ['STORE_MANAGER', 'CEO'] } },
        });
        for (const user of storeUsers) {
          await this.prisma.notification.create({
            data: {
              title: 'مخزون منخفض',
              titleEn: 'Low Stock',
              message: `المخزون من ${item.name} منخفض (المتبقي ${item.quantity} ${item.unit})`,
              messageEn: `Stock of ${item.name} is low (${item.quantity} ${item.unit} remaining)`,
              type: 'warning',
              userId: user.id,
              entityType: 'inventory',
              entityId: item.id,
              link: `/inventory/${item.id}`,
            },
          });
        }
      }
    }

    return Result.ok(toResult(stockMovement));
  }
}
