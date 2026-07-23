import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { EmployerBoqItem } from '../../domain/employer-boq-item.entity';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { UpsertEmployerBoqItemInput, EmployerBoqItemResult } from '../dto/employer-boq.dto';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from '../errors/employer-boq-application.error';
import { toEmployerBoqItemResult } from './list-employer-boq-items.use-case';
import { SyncAnalyticalFromEmployerUseCase } from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';
import { AddAnalyticalFromEmployerUseCase } from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';

export class UpsertEmployerBoqItemUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncAnalyticalFromEmployer: SyncAnalyticalFromEmployerUseCase,
    private readonly addAnalyticalFromEmployer: AddAnalyticalFromEmployerUseCase,
  ) {}

  async execute(input: UpsertEmployerBoqItemInput): Promise<Result<EmployerBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    if (input.itemCode) {
      return this.upsertByItemCode(buildingId, input);
    }

    const existing = await this.employerBoq.findByBuildingIdDescriptionAndUnit(
      buildingId,
      input.description,
      input.unit,
    );
    if (existing) {
      return this.updateExisting(existing, input);
    }

    const itemCode = await this.employerBoq.generateNextItemCode(buildingId);
    const created = EmployerBoqItem.create({
      buildingId,
      itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (created.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          created.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    const item = created.getValue();
    await this.employerBoq.save(item);
    await this.addAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: item.itemCode,
    });
    return Result.ok(toEmployerBoqItemResult(item));
  }

  private async upsertByItemCode(
    buildingId: UniqueEntityId,
    input: UpsertEmployerBoqItemInput,
  ): Promise<Result<EmployerBoqItemResult>> {
    const itemCode = input.itemCode as string;
    const existing = await this.employerBoq.findByBuildingIdAndItemCode(buildingId, itemCode);

    if (existing) {
      return this.updateExisting(existing, input);
    }

    const created = EmployerBoqItem.create({
      buildingId,
      itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (created.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          created.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    const item = created.getValue();
    await this.employerBoq.save(item);
    await this.addAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: item.itemCode,
    });
    return Result.ok(toEmployerBoqItemResult(item));
  }

  private async updateExisting(
    existing: EmployerBoqItem,
    input: UpsertEmployerBoqItemInput,
  ): Promise<Result<EmployerBoqItemResult>> {
    const updateResult = existing.update({
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (updateResult.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          updateResult.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    await this.employerBoq.save(existing);
    await this.syncAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: existing.itemCode,
    });
    return Result.ok(toEmployerBoqItemResult(existing));
  }
}
