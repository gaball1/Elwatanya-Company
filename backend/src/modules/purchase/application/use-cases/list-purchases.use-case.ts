import { Result } from '@/shared/kernel/result';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { PurchaseResult, toResult } from '../dto/purchase.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class ListPurchasesUseCase {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(user: OwnershipActor | undefined, projectId?: string, status?: string): Promise<Result<PurchaseResult[]>> {
    const accessible = this.ownership.getAccessibleProjectIds(user);
    if (accessible === null) {
      const purchases = status
        ? await this.purchaseRepo.findByStatus(status, projectId)
        : projectId
          ? await this.purchaseRepo.findByProjectId(projectId)
          : await this.purchaseRepo.findAll();
      return Result.ok(purchases.map(toResult));
    }
    if (projectId && !accessible.includes(projectId)) {
      return Result.ok([]);
    }
    const target = projectId ? [projectId] : accessible;
    const purchases = await this.purchaseRepo.findByProjectIds(target, status);
    return Result.ok(purchases.map(toResult));
  }
}
