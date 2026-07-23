import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import {
  SyncAnalyticalFromEmployerInput,
  AddAnalyticalFromEmployerInput,
} from '../dto/analytical-boq.dto';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';

export class SyncAnalyticalFromEmployerUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
  ) {}

  async execute(input: SyncAnalyticalFromEmployerInput): Promise<Result<void>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const employerItem = await this.employerBoq.findByBuildingIdAndItemCode(
      buildingId,
      input.itemCode,
    );
    if (!employerItem) {
      return Result.ok();
    }

    const existing = await this.analyticalBoq.findByBuildingIdAndItemCode(
      buildingId,
      input.itemCode,
    );
    if (!existing) {
      return Result.ok();
    }

    const syncResult = existing.replaceFromEmployer({
      description: employerItem.description,
      unit: employerItem.unit,
      quantity: employerItem.quantity,
      unitPrice: employerItem.unitPrice,
    });
    if (syncResult.isFailure) {
      return Result.fail(syncResult.error as Error);
    }

    await this.analyticalBoq.save(existing);
    // Mirrors syncAnalyticalFromEmployer → setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId });
    return Result.ok();
  }
}

export class AddAnalyticalFromEmployerUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
  ) {}

  async execute(input: AddAnalyticalFromEmployerInput): Promise<Result<void>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const employerItem = await this.employerBoq.findByBuildingIdAndItemCode(
      buildingId,
      input.itemCode,
    );
    if (!employerItem) {
      return Result.ok();
    }

    const existing = await this.analyticalBoq.findByBuildingIdAndItemCode(
      buildingId,
      input.itemCode,
    );
    if (existing) {
      return Result.ok();
    }

    const created = AnalyticalBoqItem.createFromEmployer({
      buildingId,
      itemCode: employerItem.itemCode,
      description: employerItem.description,
      unit: employerItem.unit,
      quantity: employerItem.quantity,
      unitPrice: employerItem.unitPrice,
      totalValue: employerItem.totalValue,
    });
    if (created.isFailure) {
      return Result.fail(created.error as Error);
    }

    await this.analyticalBoq.save(created.getValue());
    // Mirrors addToAnalyticalFromEmployer → setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId });
    return Result.ok();
  }
}
