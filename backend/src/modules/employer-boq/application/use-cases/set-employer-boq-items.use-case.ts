import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { EmployerBoqItem } from '../../domain/employer-boq-item.entity';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { SetEmployerBoqItemsInput, EmployerBoqItemResult } from '../dto/employer-boq.dto';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from '../errors/employer-boq-application.error';
import { toEmployerBoqItemResult } from './list-employer-boq-items.use-case';

export class SetEmployerBoqItemsUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(input: SetEmployerBoqItemsInput): Promise<Result<EmployerBoqItemResult[]>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const codes = new Set<string>();
    const domainItems: EmployerBoqItem[] = [];

    for (const item of input.items) {
      if (codes.has(item.itemCode)) {
        return Result.fail(
          new EmployerBoqApplicationError(
            EmployerBoqErrorCode.DUPLICATE_ITEM_CODE,
            `Duplicate item code in request: ${item.itemCode}`,
          ),
        );
      }
      codes.add(item.itemCode);

      const created = EmployerBoqItem.create({
        buildingId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      if (created.isFailure) {
        return Result.fail(
          new EmployerBoqApplicationError(
            EmployerBoqErrorCode.INVALID_ITEM,
            created.error?.message ?? 'Invalid employer BOQ item',
          ),
        );
      }
      domainItems.push(created.getValue());
    }

    await this.employerBoq.replaceAllForBuilding(buildingId, domainItems);
    return Result.ok(domainItems.map(toEmployerBoqItemResult));
  }
}
