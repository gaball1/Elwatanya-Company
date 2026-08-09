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
import { FinalItemStatus } from '../../domain/final-boq-rules';
import {
  UpdateFinalBoqItemInput,
  UpdateFinalItemQuantityInput,
  FinalBoqItemResult,
} from '../dto/final-boq.dto';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '../errors/final-boq-application.error';
import { applyFinalItemQuantityUpdate } from '../../domain/final-boq-rules';
import { getOrCreateFinalBoq, toFinalBoqItemResult, toItemStateInput } from './final-boq-mappers';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';

/** Mirrors updateFinalItem */
export class UpdateFinalBoqItemUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateFinalBoqItemInput, userProjectId?: string | null, userId?: string): Promise<Result<FinalBoqItemResult>> {
    await this.ownership.verifyBuildingAccess(userProjectId, input.buildingId);
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

    item.applyPatch({
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      unit: input.unit,
      status: input.status as FinalItemStatus | undefined,
    });

    await this.finalBoq.save(aggregate);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'UPDATE', before: null, after: { itemCode: item.businessCode, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice } });
    }
    // Frontend calls recalcFinalRemaining after patch
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}

/** Mirrors updateFinalItemQuantity */
export class UpdateFinalItemQuantityUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateFinalItemQuantityInput, userProjectId?: string | null, userId?: string): Promise<Result<FinalBoqItemResult | null>> {
    await this.ownership.verifyBuildingAccess(userProjectId, input.buildingId);
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

    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    const next = applyFinalItemQuantityUpdate(
      toItemStateInput(item),
      input.quantity,
      allocationRefs,
      input.unitPrice,
    );

    if (!next) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.QUANTITY_BELOW_ALLOCATED,
          'New quantity is less than allocated quantity',
        ),
      );
    }

    item.setState({
      description: next.description,
      unit: next.unit,
      quantity: next.quantity,
      unitPrice: next.unitPrice,
      totalValue: next.totalValue,
      itemStatus: next.status,
      isAnalyzed: next.isAnalyzed,
    });

    for (const compState of next.components) {
      const comp = item.findComponent(new UniqueEntityId(compState.id));
      if (comp) {
        comp.applyScaledQuantity(compState.quantity);
      }
    }

    await this.finalBoq.save(aggregate);
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'UPDATE_QUANTITY', before: null, after: { itemCode: item.businessCode, quantity: input.quantity, unitPrice: input.unitPrice } });
    }
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}

/** Mirrors removeFinalItem */
export class RemoveFinalBoqItemUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(buildingId: string, itemCode: string, userProjectId?: string | null, userId?: string): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(userProjectId, buildingId);
    const buildingEntityId = new UniqueEntityId(buildingId);
    const building = await this.buildings.findById(buildingEntityId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await this.finalBoq.findByBuildingId(buildingEntityId);
    if (!aggregate) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    if (!aggregate.removeItemByCode(itemCode)) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    await this.finalBoq.save(aggregate);
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: buildingId, action: 'DELETE', before: { itemCode }, after: null });
    }
    return Result.ok();
  }
}
