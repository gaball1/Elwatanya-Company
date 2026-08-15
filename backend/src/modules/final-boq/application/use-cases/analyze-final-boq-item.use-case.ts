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
import { validateComponentsWithinBudget, getComponentAllocatedQty } from '../../domain/final-boq-rules';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '../errors/final-boq-application.error';
import { getOrCreateFinalBoq, toFinalBoqItemResult } from './final-boq-mappers';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';

/** Mirrors analyzeFinalItem */
export class AnalyzeFinalBoqItemUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AnalyzeFinalBoqItemInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult>> {
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

    const budget = validateComponentsWithinBudget(
      item.totalValue,
      input.components.map((c) => ({ quantity: item.quantity, unitPrice: c.unitPrice })),
    );
    if (!budget.ok) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_PRICE_EXCEEDS_ITEM,
          budget.error,
        ),
      );
    }

    item.analyze(input.components);
    await this.finalBoq.save(aggregate);

    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'ANALYZE', before: null, after: { itemCode: item.businessCode, components: input.components } });
    }

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
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AddFinalBoqComponentInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult>> {
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

    const budget = validateComponentsWithinBudget(item.totalValue, [
      ...item.components.map((c) => ({ quantity: c.quantity, unitPrice: c.unitPrice })),
      { quantity: item.quantity, unitPrice: input.unitPrice },
    ]);
    if (!budget.ok) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_PRICE_EXCEEDS_ITEM,
          budget.error,
        ),
      );
    }

    item.addComponent({
      name: input.name,
      unit: input.unit,
      unitPrice: input.unitPrice,
    });
    await this.finalBoq.save(aggregate);

    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'ADD_COMPONENT', before: null, after: { itemCode: item.businessCode, componentName: input.name } });
    }

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
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RemoveFinalBoqComponentInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult>> {
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

    if (!item.removeComponent(new UniqueEntityId(input.componentId))) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_NOT_FOUND,
          'Component not found',
        ),
      );
    }

    await this.finalBoq.save(aggregate);
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'REMOVE_COMPONENT', before: null, after: { itemCode: item.businessCode, componentId: input.componentId } });
    }
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
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateFinalBoqComponentInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult | null>> {
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

    const componentId = new UniqueEntityId(input.componentId);
    const component = item.findComponent(componentId);
    if (!component) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_NOT_FOUND,
          'Component not found',
        ),
      );
    }

    const nextQuantity = input.quantity ?? component.quantity;
    const nextUnitPrice = input.unitPrice ?? component.unitPrice;

    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);
    if (
      input.quantity !== undefined &&
      input.quantity < component.quantity &&
      getComponentAllocatedQty(allocationRefs, item.itemCode, component.id.toValue()) > 0
    ) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.QUANTITY_CANNOT_DECREASE,
          `لا يمكن تقليل كمية المكوّن ${component.name} بعد توزيعه`,
        ),
      );
    }

    const budget = validateComponentsWithinBudget(
      item.totalValue,
      item.components.map((c) =>
        c.id.equals(componentId)
          ? { quantity: nextQuantity, unitPrice: nextUnitPrice }
          : { quantity: c.quantity, unitPrice: c.unitPrice },
      ),
    );
    if (!budget.ok) {
      return Result.fail(
        new FinalBoqApplicationError(
          FinalBoqErrorCode.COMPONENT_PRICE_EXCEEDS_ITEM,
          budget.error,
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
    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: item.id.toValue(), action: 'UPDATE_COMPONENT', before: null, after: { itemCode: item.businessCode, componentId: input.componentId, quantity: input.quantity, unitPrice: input.unitPrice } });
    }
    return Result.ok(toFinalBoqItemResult(item, allocationRefs));
  }
}
