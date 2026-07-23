import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import { UpdateAnalyticalBoqItemInput, AnalyticalBoqItemResult } from '../dto/analytical-boq.dto';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from '../errors/analytical-boq-application.error';
import { toAnalyticalBoqItemResult } from './list-analytical-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';

export class UpdateAnalyticalBoqItemUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
  ) {}

  async execute(input: UpdateAnalyticalBoqItemInput): Promise<Result<AnalyticalBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const existing = await this.analyticalBoq.findByBuildingIdAndItemCode(buildingId, input.itemCode);
    if (!existing) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.ITEM_NOT_FOUND,
          'Analytical BOQ item not found',
        ),
      );
    }

    const updateResult = existing.update({
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (updateResult.isFailure) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.INVALID_ITEM,
          updateResult.error?.message ?? 'Invalid analytical BOQ item',
        ),
      );
    }

    await this.analyticalBoq.save(existing);
    // Mirrors updateAnalyticalItem → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId });
    return Result.ok(toAnalyticalBoqItemResult(existing));
  }
}
