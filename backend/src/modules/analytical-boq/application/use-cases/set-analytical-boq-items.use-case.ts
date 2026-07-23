import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import { SetAnalyticalBoqItemsInput, AnalyticalBoqItemResult } from '../dto/analytical-boq.dto';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from '../errors/analytical-boq-application.error';
import { toAnalyticalBoqItemResult } from './list-analytical-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';

export class SetAnalyticalBoqItemsUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
  ) {}

  async execute(input: SetAnalyticalBoqItemsInput): Promise<Result<AnalyticalBoqItemResult[]>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const codes = new Set<string>();
    const domainItems: AnalyticalBoqItem[] = [];

    for (const item of input.items) {
      if (codes.has(item.itemCode)) {
        return Result.fail(
          new AnalyticalBoqApplicationError(
            AnalyticalBoqErrorCode.DUPLICATE_ITEM_CODE,
            `Duplicate item code in request: ${item.itemCode}`,
          ),
        );
      }
      codes.add(item.itemCode);

      const created = AnalyticalBoqItem.create({
        buildingId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      if (created.isFailure) {
        return Result.fail(
          new AnalyticalBoqApplicationError(
            AnalyticalBoqErrorCode.INVALID_ITEM,
            created.error?.message ?? 'Invalid analytical BOQ item',
          ),
        );
      }
      domainItems.push(created.getValue());
    }

    await this.analyticalBoq.replaceAllForBuilding(buildingId, domainItems);
    // Mirrors setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId });
    return Result.ok(domainItems.map(toAnalyticalBoqItemResult));
  }
}
