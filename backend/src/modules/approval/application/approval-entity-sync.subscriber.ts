import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { DomainEvent } from '@/modules/domain-events/domain/event-bus.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PurchaseStockService } from '@/modules/purchase/application/purchase-stock.service';

interface EntityTarget {
  model: 'purchase' | 'leave' | 'fundTransaction' | 'clientStatement' | 'subcontractorStatement' | 'statement';
  approvedStatus: string;
  rejectedStatus: string;
}

// Note: 'inventory' is intentionally NOT in ENTITY_TARGETS. Inventory approval state
// (draft/pending/approved/rejected/cancelled) is tracked on the Approval record itself and
// is independent of the item's operational status (active/inactive). Approving an inventory
// request must not flip the item's operational status.
const ENTITY_TARGETS: Record<string, EntityTarget> = {
  purchase: { model: 'purchase', approvedStatus: 'approved', rejectedStatus: 'cancelled' },
  leave: { model: 'leave', approvedStatus: 'approved', rejectedStatus: 'rejected' },
  'fund-transaction': { model: 'fundTransaction', approvedStatus: 'approved', rejectedStatus: 'rejected' },
  'client-statement': { model: 'clientStatement', approvedStatus: 'approved', rejectedStatus: 'rejected' },
  'subcontractor-statement': { model: 'subcontractorStatement', approvedStatus: 'approved', rejectedStatus: 'rejected' },
  extract: { model: 'statement', approvedStatus: 'final', rejectedStatus: 'running' },
};

@Injectable()
export class ApprovalEntitySyncSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ApprovalEntitySyncSubscriber.name);

  constructor(
    private readonly eventBus: EventBusImpl,
    private readonly prisma: PrismaService,
    private readonly stockService: PurchaseStockService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('*', {
      handle: async (event: DomainEvent) => {
        if (event.eventName === 'ApprovalApproved') {
          await this.syncStatus(event, 'approved');
        } else if (event.eventName === 'ApprovalRejected') {
          await this.syncStatus(event, 'rejected');
        }
      },
    });
    this.logger.log('Approval entity sync subscriber listening for approval events');
  }

  /**
   * Applies an approval outcome to the underlying entity atomically:
   * - flips the entity status to the target approved/rejected status
   * - credits the عهدة fund when a "request" fund-transaction is approved
   * - reverses the recorded purchase expense when a purchase approval is rejected,
   *   so rejected purchases never stay on the ledger
   */
  private async syncStatus(event: DomainEvent, outcome: 'approved' | 'rejected'): Promise<void> {
    const entityType = event.payload?.entityType;
    const entityId = event.payload?.entityId;
    const target = ENTITY_TARGETS[entityType];
    if (!target || !entityId) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        const status = outcome === 'approved' ? target.approvedStatus : target.rejectedStatus;
        await (tx[target.model] as any).updateMany({
          where: { id: entityId },
          data: { status },
        });

        if (outcome === 'approved' && target.model === 'fundTransaction') {
          await this.creditFundFromApprovedRequest(tx, entityId);
        }

        if (outcome === 'rejected' && target.model === 'purchase') {
          await this.reversePurchaseExpense(tx, entityId);
        }
      });
    } catch (error) {
      this.logger.warn(`Could not sync status for ${entityType} ${entityId}: ${(error as Error).message}`);
    }
  }

  /** Approving a "request"-type fund transaction increases the project fund (عهدة) balance by its amount. */
  private async creditFundFromApprovedRequest(tx: Prisma.TransactionClient, transactionId: string): Promise<void> {
    const txn = await tx.fundTransaction.findFirst({ where: { id: transactionId } });
    if (!txn || txn.type !== 'request') return;

    const fund = await tx.projectFund.findFirst({
      where: { id: txn.fundId, deletedAt: null },
    });
    if (!fund) return;

    const newBalance = new Prisma.Decimal(fund.currentBalance).plus(txn.amount);
    await tx.projectFund.update({
      where: { id: fund.id },
      data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
    });
  }

  /**
   * Rejecting a purchase returns it to a non-committed (cancelled) state and reverses the
   * expense that was recorded when it was created, so a rejected purchase never affects
   * the treasury ledger.
   */
  private async reversePurchaseExpense(tx: Prisma.TransactionClient, purchaseId: string): Promise<void> {
    const purchase = await tx.purchase.findFirst({ where: { id: purchaseId } });
    if (!purchase) return;

    // A purchase that had physically received stock must have that stock reversed.
    if (purchase.status === 'received') {
      await this.stockService.reverseStockIn(
        {
          itemName: purchase.itemName,
          quantity: Number(purchase.quantity),
          unit: purchase.unit,
          unitPrice: Number(purchase.unitPrice),
          categoryId: purchase.categoryId || undefined,
          supplierName: purchase.supplierName,
          createdBy: 'system',
          date: new Date(),
          purchaseId: purchase.id,
        },
        tx,
      );
    }

    const fund = await tx.projectFund.findFirst({
      where: { projectId: purchase.projectId, deletedAt: null },
    });
    if (!fund) return;

    const newBalance = new Prisma.Decimal(fund.currentBalance).plus(purchase.total);
    await tx.projectFund.update({
      where: { id: fund.id },
      data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
    });

    await tx.fundTransaction.create({
      data: {
        id: crypto.randomUUID(),
        fundId: fund.id,
        type: 'add',
        category: 'purchase',
        amount: new Prisma.Decimal(purchase.total),
        description: `عكس مشتريات مرفوضة: ${purchase.itemName}`,
        date: new Date(),
        status: 'approved',
        referenceId: purchase.id,
        notes: `رفض الموافقة: ${purchase.itemName}`,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
