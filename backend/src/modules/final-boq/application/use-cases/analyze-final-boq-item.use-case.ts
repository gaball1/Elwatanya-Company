import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from '../../domain/final-boq.repository';
import {
  AnalyzeFinalBoqItemInput,
  AddFinalBoqComponentInput,
  UpdateFinalBoqComponentInput,
  RemoveFinalBoqComponentInput,
  FinalBoqItemResult,
} from '../dto/final-boq.dto';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '../errors/final-boq-application.error';
import { getOrCreateFinalBoq, toFinalBoqItemResult } from './final-boq-mappers';

/** Mirrors analyzeFinalItem */
export class AnalyzeFinalBoqItemUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: AnalyzeFinalBoqItemInput): Promise<Result<FinalBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    item.analyze(input.components);
    await this.finalBoq.save(aggregate);

    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}

/** Mirrors addComponentToFinalItem */
export class AddFinalBoqComponentUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: AddFinalBoqComponentInput): Promise<Result<FinalBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    item.addComponent({
      name: input.name,
      unit: input.unit,
      unitPrice: input.unitPrice,
    });
    await this.finalBoq.save(aggregate);

    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}

/** Mirrors removeComponentFromFinalItem */
export class RemoveFinalBoqComponentUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: RemoveFinalBoqComponentInput): Promise<Result<FinalBoqItemResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    if (!item.removeComponent(new UniqueEntityId(input.componentId))) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_NOT_FOUND,
          'Component not found',
        ),
      );
    }

    await this.finalBoq.save(aggregate);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}

/**
 * Mirrors updateComponentPrice / updateComponentOnly / updateComponentQuantity.
 * Quantity guard: newQuantity > item.quantity → null (COMPONENT_QTY_EXCEEDS_ITEM).
 */
export class UpdateFinalBoqComponentUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
  ) {}

  async execute(input: UpdateFinalBoqComponentInput): Promise<Result<FinalBoqItemResult | null>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    const componentId = new UniqueEntityId(input.componentId);
    if (!item.findComponent(componentId)) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_NOT_FOUND,
          'Component not found',
        ),
      );
    }

    if (input.quantity !== undefined) {
      if (!item.updateComponentQuantity(componentId, input.quantity)) {
        return Result.fail(
          new FinalBoqApplicationError(
            FinalBoqErrorCode.COMPONENT_QTY_EXCEEDS_ITEM,
            'Component quantity cannot exceed item quantity',
          ),
        );
      }
    }

    if (input.unitPrice !== undefined) {
      item.updateComponentPrice(componentId, input.unitPrice);
    }

    await this.finalBoq.save(aggregate);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}
