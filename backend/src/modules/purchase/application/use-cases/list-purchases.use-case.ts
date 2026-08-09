import { Result } from '@/shared/kernel/result';
import { IPurchaseRepository } from '../../domain/purchase.repository';
import { PurchaseResult, toResult } from '../dto/purchase.dto';

export class ListPurchasesUseCase {
  constructor(private readonly purchaseRepo: IPurchaseRepository) {}

  async execute(projectId?: string): Promise<Result<PurchaseResult[]>> {
    const purchases = projectId
      ? await this.purchaseRepo.findByProjectId(projectId)
      : await this.purchaseRepo.findAll();
    return Result.ok(purchases.map(toResult));
  }
}
