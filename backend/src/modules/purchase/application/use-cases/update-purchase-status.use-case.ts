import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { PurchaseStatus } from '../../domain/purchase.entity';
import { PurchaseResult, toResult } from '../dto/purchase.dto';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/common/services/notification.service';
import { PurchaseStockService } from '../purchase-stock.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export type PurchaseStatusAction = 'approved' | 'received' | 'cancelled';

export class UpdatePurchaseStatusUseCase {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly stockService: PurchaseStockService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, status: PurchaseStatusAction, warehouseId: string | undefined, user: OwnershipActor | undefined): Promise<Result<PurchaseResult>> {
    const purchase = await this.purchaseRepo.findById(new UniqueEntityId(id));
    if (!purchase) return Result.fail(new Error('Purchase not found'));

    await this.ownership.verifyProjectAccess(user, purchase.projectId);

    if (status === 'received' && !warehouseId) {
      return Result.fail(new Error('Destination warehouse is required when receiving a purchase'));
    }

    const wasReceived = purchase.status === 'received';

    let actionResult: Result<void>;

    switch (status) {
      case 'approved':
        actionResult = purchase.approve();
        break;
      case 'received':
        actionResult = purchase.markReceived();
        break;
      case 'cancelled':
        actionResult = purchase.cancel();
        break;
      default:
        return Result.fail(new Error(`Invalid status: ${status}`));
    }

    if (actionResult.isFailure) return Result.fail(actionResult.error as Error);

    const stockCtx = {
      itemName: purchase.itemName,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      categoryId: purchase.categoryId || undefined,
      supplierName: purchase.supplierName,
      createdBy: purchase.createdBy || 'system',
      date: purchase.date,
      purchaseId: purchase.id.toValue(),
      warehouseId: warehouseId || '',
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        // Atomic status transition guards against concurrent double-transitions
        // (e.g. two simultaneous "received" calls would otherwise double stock-in).
        const allowedFrom: Record<PurchaseStatusAction, PurchaseStatus[]> = {
          approved: ['pending', 'approved'],
          received: ['approved'],
          cancelled: ['pending', 'approved', 'received'],
        };
        const transitioned = await this.purchaseRepo.transition(
          purchase.id.toValue(),
          allowedFrom[status],
          status,
          tx,
        );
        if (!transitioned) {
          throw new Error(
            status === 'received'
              ? 'Purchase is already received or was cancelled'
              : `Purchase is already ${status} or was cancelled`,
          );
        }

        await this.purchaseRepo.save(purchase, tx);

        if (status === 'cancelled') {
          // Physical receipt already happened -> reverse the stock before cancelling.
          if (wasReceived) {
            await this.stockService.reverseStockIn(stockCtx, tx);
          }
          await this.financialService.reverseExpense({
            projectId: purchase.projectId,
            amount: purchase.total,
            category: 'purchase',
            referenceId: purchase.id.toValue(),
            description: `إلغاء مشتريات: ${purchase.itemName}`,
            createdBy: 'system',
          }, tx);
        }

        if (status === 'received') {
          // Physical receipt -> stock-in, then permanently link the purchase to its item.
          const itemId = await this.stockService.stockIn(stockCtx, tx);
          purchase.linkInventoryItem(itemId);
          if (warehouseId) purchase.assignWarehouse(warehouseId);
          await this.purchaseRepo.save(purchase, tx);
        }
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    const titles: Record<PurchaseStatusAction, { ar: string; en: string; msgAr: string; msgEn: string }> = {
      approved: {
        ar: 'تم اعتماد طلب الشراء',
        en: 'Purchase Approved',
        msgAr: `تم اعتماد طلب الشراء: ${purchase.itemName}`,
        msgEn: `Purchase request approved: ${purchase.itemName}`,
      },
      received: {
        ar: 'تم استلام المشتريات',
        en: 'Purchase Received',
        msgAr: `تم استلام المشتريات وإضافتها للمخزون: ${purchase.itemName}`,
        msgEn: `Purchase received and added to inventory: ${purchase.itemName}`,
      },
      cancelled: {
        ar: 'تم إلغاء طلب الشراء',
        en: 'Purchase Cancelled',
        msgAr: `تم إلغاء طلب الشراء: ${purchase.itemName}`,
        msgEn: `Purchase request cancelled: ${purchase.itemName}`,
      },
    };

    const t = titles[status];
    await this.notifications.createForProjectMembers(purchase.projectId, {
      title: t.ar,
      titleEn: t.en,
      message: t.msgAr,
      messageEn: t.msgEn,
      type: status === 'cancelled' ? 'warning' : 'success',
      entityType: 'purchase',
      entityId: purchase.id.toValue(),
      link: `/projects/${purchase.projectId}/purchases/${purchase.id.toValue()}`,
    });

    return Result.ok(toResult(purchase));
  }
}