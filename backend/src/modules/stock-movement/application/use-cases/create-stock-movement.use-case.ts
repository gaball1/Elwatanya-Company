import { Result } from '@/shared/kernel/result';
import { IStockMovementRepository } from '../../domain/stock-movement.repository';
import { CreateStockMovementInput, StockMovementResult } from '../dto/stock-movement.dto';
import { StockMovement } from '../../domain/stock-movement.entity';
import { toResult } from './list-stock-movements.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { StockMovementCreatedEvent } from '@/modules/domain-events/events';

export class CreateStockMovementUseCase {
  constructor(
    private readonly stockMovements: IStockMovementRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreateStockMovementInput): Promise<Result<StockMovementResult>> {
    const result = StockMovement.create({
      itemId: input.itemId,
      type: input.type as StockMovement['type'],
      quantity: input.quantity,
      date: input.date,
      reference: input.reference,
      notes: input.notes,
      createdBy: input.createdBy,
      issuedTo: input.issuedTo,
      supplier: input.supplier,
      fromWarehouse: input.fromWarehouse,
      toWarehouse: input.toWarehouse,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const stockMovement = result.getValue();
    await this.stockMovements.save(stockMovement);

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
