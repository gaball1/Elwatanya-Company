import { Result } from '@/shared/kernel/result';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { CreatePurchaseInput, PurchaseResult, toResult } from '../dto/purchase.dto';
import { Purchase } from '../../domain/purchase.entity';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PurchaseCreatedEvent } from '@/modules/domain-events/events';

export class CreatePurchaseUseCase {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreatePurchaseInput): Promise<Result<PurchaseResult>> {
    const result = Purchase.create({
      projectId: input.projectId,
      buildingId: input.buildingId,
      supplierId: input.supplierId,
      itemName: input.itemName,
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice,
      date: input.date,
      notes: input.notes,
      invoiceFile: input.invoiceFile,
      supplierName: input.supplierName,
      createdBy: input.createdBy,
      categoryId: input.categoryId,
      inventoryItemId: input.inventoryItemId,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const purchase = result.getValue();

    try {
      await this.prisma.$transaction(async (tx) => {
        // Enforce the عهدة (project fund) balance: a purchase may not exceed available funds
        const fund = await tx.projectFund.findFirst({
          where: { projectId: input.projectId, deletedAt: null },
        });
        if (!fund) {
          throw new Error('لا توجد عهدة لهذا المشروع. برجاء إنشاء عهدة أولاً');
        }
        if (new Prisma.Decimal(purchase.total).gt(fund.currentBalance)) {
          throw new Error(
            `رصيد العهدة غير كافٍ. المتاح: ${Number(fund.currentBalance).toLocaleString('en-EG')}، المطلوب: ${Number(purchase.total).toLocaleString('en-EG')}`,
          );
        }

        await this.purchaseRepo.save(purchase, tx);
        await this.financialService.recordExpense({
          projectId: input.projectId,
          amount: purchase.total,
          category: 'purchase',
          referenceId: purchase.id.toValue(),
          description: `مشتريات: ${input.itemName} (كمية: ${input.quantity})`,
          createdBy: input.createdBy ?? 'system',
          date: input.date,
        }, tx);
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    await this.eventBus.publish(
      new PurchaseCreatedEvent(
        purchase.id.toValue(),
        'purchase',
        {
          id: purchase.id.toValue(),
          projectId: input.projectId,
          supplierName: input.supplierName ?? '',
          amount: purchase.total,
          status: purchase.status,
          createdBy: input.createdBy,
        },
      ),
    );

    return Result.ok(toResult(purchase));
  }
}
