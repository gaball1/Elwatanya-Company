import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { UpdatePurchaseInput, PurchaseResult, toResult } from '../dto/purchase.dto';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class UpdatePurchaseUseCase {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: UpdatePurchaseInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<PurchaseResult>> {
    const purchase = await this.purchaseRepo.findById(new UniqueEntityId(input.id));
    if (!purchase) return Result.fail(new Error('Purchase not found'));

    await this.ownership.verifyProjectAccess(user, purchase.projectId);
    if (input.buildingId) await this.ownership.verifyBuildingAccess(user, input.buildingId);

    if (purchase.status !== 'pending') {
      return Result.fail(new Error('Only pending purchases can be edited. Approved/received/cancelled purchases are locked'));
    }

    const oldTotal = purchase.total;

    const updateResult = purchase.update({
      itemName: input.itemName,
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice,
      date: input.date,
      notes: input.notes,
      invoiceFile: input.invoiceFile,
      supplierName: input.supplierName,
      buildingId: input.buildingId,
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      inventoryItemId: input.inventoryItemId,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    const newTotal = purchase.total;
    const diff = newTotal - oldTotal;

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.purchaseRepo.save(purchase, tx);
        if (diff !== 0) {
          if (diff > 0) {
            await this.financialService.recordExpense({
              projectId: purchase.projectId,
              amount: diff,
              category: 'purchase',
              referenceId: purchase.id.toValue(),
              description: `تعديل مشتريات: ${purchase.itemName} (زيادة ${diff.toFixed(2)})`,
              createdBy: userId ?? 'system',
              date: new Date(),
            }, tx);
          } else {
            await this.financialService.reverseExpense({
              projectId: purchase.projectId,
              amount: Math.abs(diff),
              category: 'purchase',
              referenceId: purchase.id.toValue(),
              description: `تعديل مشتريات: ${purchase.itemName} (نقص ${Math.abs(diff).toFixed(2)})`,
              createdBy: userId ?? 'system',
            }, tx);
          }
        }
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok(toResult(purchase));
  }
}
