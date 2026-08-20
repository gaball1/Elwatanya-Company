import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { FinancialService } from '@/common/services/financial.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeletePurchaseUseCase {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const purchase = await this.purchaseRepo.findById(new UniqueEntityId(id));
    if (!purchase) return Result.fail(new Error('Purchase not found'));

    await this.ownership.verifyProjectAccess(user, purchase.projectId);

    if (purchase.status === 'approved' || purchase.status === 'received') {
      return Result.fail(new Error('Cannot delete an approved/received purchase. Cancel it instead'));
    }

    const deleteResult = purchase.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.purchaseRepo.save(purchase, tx);
        // Only a pending purchase still carries its recorded expense; a cancelled purchase
        // already had its expense reversed, so deleting it must not reverse a second time.
        if (purchase.status === 'pending') {
          await this.financialService.reverseExpense({
            projectId: purchase.projectId,
            amount: purchase.total,
            category: 'purchase',
            referenceId: purchase.id.toValue(),
            description: `عكس مشتريات: ${purchase.itemName}`,
            createdBy: 'system',
          }, tx);
        }
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok();
  }
}
