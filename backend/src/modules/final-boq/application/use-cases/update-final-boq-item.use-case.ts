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
import { applyFinalItemQuantityUpdate, isFinalItemCommitted, validateComponentsWithinBudget } from '../../domain/final-boq-rules';
import { getOrCreateFinalBoq, toFinalBoqItemResult, toItemStateInput } from './final-boq-mappers';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
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

  async execute(input: UpdateFinalBoqItemInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
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

    if (item.components.length > 0 && (input.quantity !== undefined || input.unitPrice !== undefined)) {
      const nextTotal = (input.quantity ?? item.quantity) * (input.unitPrice ?? item.unitPrice);
      const budget = validateComponentsWithinBudget(
        nextTotal,
        item.components.map((c) => ({ quantity: c.quantity, unitPrice: c.unitPrice })),
      );
      if (!budget.ok) {
        return Result.fail(
          new FinalBoqApplicationError(
            FinalBoqErrorCode.COMPONENT_PRICE_EXCEEDS_ITEM,
            budget.error,
          ),
        );
      }
    }

    if (
      input.quantity !== undefined &&
      input.quantity < item.quantity &&
      isFinalItemCommitted(toItemStateInput(item))
    ) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.QUANTITY_CANNOT_DECREASE,
          `لا يمكن تقليل كمية البند ${item.businessCode} بعد تحليله أو توزيعه`,
        ),
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

  async execute(input: UpdateFinalItemQuantityInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult | null>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
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
    const itemState = toItemStateInput(item);
    if (isFinalItemCommitted(itemState) && input.quantity < item.quantity) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.QUANTITY_CANNOT_DECREASE,
          `لا يمكن تقليل كمية البند ${item.businessCode} بعد تحليله أو توزيعه`,
        ),
      );
    }
    const next = applyFinalItemQuantityUpdate(
      itemState,
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

    const budget = validateComponentsWithinBudget(
      next.totalValue,
      next.components,
    );
    if (!budget.ok) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_PRICE_EXCEEDS_ITEM,
          budget.error,
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

  async execute(buildingId: string, itemCode: string, user?: OwnershipActor, userId?: string): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
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

    const item = aggregate.findItemByCode(itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'Final BOQ item not found'),
      );
    }

    if (isFinalItemCommitted(toItemStateInput(item))) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.ITEM_IS_COMMITTED,
          `لا يمكن حذف البند ${item.businessCode} بعد تحليله أو توزيعه — يرجى التأكيد من الحذف بعد إلغاء التوزيع والتحليل`,
        ),
      );
    }

    aggregate.removeItemByCode(itemCode);

    await this.finalBoq.save(aggregate);
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: buildingId, action: 'DELETE', before: { itemCode }, after: null });
    }
    return Result.ok();
  }
}
