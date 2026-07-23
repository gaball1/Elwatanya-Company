import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { syncFinalItemState } from '@/modules/final-boq/domain/final-boq-rules';
import { toItemStateInput } from '@/modules/final-boq/application/use-cases/final-boq-mappers';
import { getOrCreateFinalBoq } from '@/modules/final-boq/application/use-cases/final-boq-mappers';
import { ISubcontractorRepository } from '@/modules/subcontractor/domain/subcontractor.repository';
import { ContractorBoq } from '../../domain/contractor-boq.entity';
import { IContractorBoqRepository } from '../../domain/contractor-boq.repository';
import {
  allocateContractorItem,
  getAvailableQtyForContractorItem,
  updateContractorItemQuantity,
  FinalItemForAllocation,
} from '../../domain/contractor-boq-rules';
import {
  AllocateContractorItemInput,
  ContractorBoqItemResult,
  ContractorBoqMetaResult,
  SetContractorMetaInput,
  UpdateContractorItemQuantityInput,
} from '../dto/contractor-boq.dto';
import {
  ContractorBoqApplicationError,
  ContractorBoqErrorCode,
} from '../errors/contractor-boq-application.error';

function toResult(items: ContractorBoq['items']): ContractorBoqItemResult[] {
  return items.map((i) => ({
    itemCode: i.itemCode,
    description: i.description,
    unit: i.unit,
    quantity: i.quantity,
    assignedQuantity: i.assignedQuantity,
    unitPrice: i.unitPrice,
    totalValue: i.totalValue,
    componentId: i.componentId?.toValue() ?? null,
    finalItemId: i.finalItemId,
  }));
}

async function getOrCreateContractorBoq(
  buildingId: UniqueEntityId,
  contractorId: UniqueEntityId,
  repo: IContractorBoqRepository,
): Promise<ContractorBoq> {
  const existing = await repo.findByBuildingAndSubcontractor(buildingId, contractorId);
  if (existing) return existing;
  const created = ContractorBoq.create({ buildingId, subcontractorId: contractorId });
  await repo.save(created);
  return created;
}

async function toFinalItemForAllocation(
  buildingId: UniqueEntityId,
  itemCode: string,
  finalBoqRepo: IFinalBoqRepository,
  contractorBoqRepo: IContractorBoqRepository,
  buildings: IBuildingRepository,
): Promise<FinalItemForAllocation | null> {
  const building = await buildings.findById(buildingId);
  if (!building) return null;
  const finalBoq = await getOrCreateFinalBoq(building, finalBoqRepo);
  const item = finalBoq.findItemByCode(itemCode);
  if (!item) return null;

  const allocations = await contractorBoqRepo.getAllocationsForBuilding(buildingId);
  const synced = syncFinalItemState(toItemStateInput(item), allocations);

  return {
    itemCode: synced.itemCode,
    description: synced.description,
    unit: synced.unit,
    quantity: synced.quantity,
    unitPrice: synced.unitPrice,
    isAnalyzed: synced.isAnalyzed,
    components: synced.components.map((c) => ({
      id: c.id,
      name: c.name,
      unit: c.unit,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      remainingQuantity: c.remainingQuantity,
    })),
  };
}

/** Mirrors getContractorBoq */
export class ListContractorBoqItemsUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(
    buildingId: string,
    contractorId: string,
  ): Promise<Result<ContractorBoqItemResult[]>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const boq = await this.contractorBoq.findByBuildingAndSubcontractor(
      new UniqueEntityId(buildingId),
      new UniqueEntityId(contractorId),
    );
    return Result.ok(boq ? toResult(boq.items) : []);
  }
}

/** Mirrors getContractorMeta / setContractorMeta */
export class SetContractorMetaUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly subcontractors: ISubcontractorRepository,
  ) {}

  async execute(input: SetContractorMetaInput): Promise<Result<ContractorBoqMetaResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const contractorId = new UniqueEntityId(input.contractorId);

    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const sub = await this.subcontractors.findById(contractorId);
    if (!sub) {
      return Result.fail(
        new ContractorBoqApplicationError(
          ContractorBoqErrorCode.SUBCONTRACTOR_NOT_FOUND,
          'Subcontractor not found',
        ),
      );
    }

    const boq = await getOrCreateContractorBoq(buildingId, contractorId, this.contractorBoq);
    boq.setMeta(input.workType);
    await this.contractorBoq.save(boq);

    return Result.ok({
      buildingId: input.buildingId,
      contractorId: input.contractorId,
      workType: input.workType,
      createdAt: boq.createdAt.toISOString(),
    });
  }
}

export class GetContractorMetaUseCase {
  constructor(private readonly contractorBoq: IContractorBoqRepository) {}

  async execute(
    buildingId: string,
    contractorId: string,
  ): Promise<Result<ContractorBoqMetaResult | null>> {
    const boq = await this.contractorBoq.findByBuildingAndSubcontractor(
      new UniqueEntityId(buildingId),
      new UniqueEntityId(contractorId),
    );
    if (!boq) return Result.ok(null);
    return Result.ok({
      buildingId,
      contractorId,
      workType: boq.workType ?? '',
      createdAt: boq.createdAt.toISOString(),
    });
  }
}

/** Mirrors allocateContractorItem */
export class AllocateContractorItemUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(
    input: AllocateContractorItemInput,
  ): Promise<Result<ContractorBoqItemResult[]>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const contractorId = new UniqueEntityId(input.contractorId);

    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const itemCode = input.itemCodeOrComponent.split('|')[0];
    const finalItem = await toFinalItemForAllocation(
      buildingId,
      itemCode,
      this.finalBoq,
      this.contractorBoq,
      this.buildings,
    );
    if (!finalItem) {
      return Result.fail(
        new ContractorBoqApplicationError(
          ContractorBoqErrorCode.FINAL_ITEM_NOT_FOUND,
          'البند غير موجود في المقايسة النهائية',
        ),
      );
    }

    const boq = await getOrCreateContractorBoq(buildingId, contractorId, this.contractorBoq);
    const result = allocateContractorItem(
      finalItem,
      boq.toItemStates(),
      input.itemCodeOrComponent,
      input.quantity,
    );

    if (!result.ok) {
      return Result.fail(
        new ContractorBoqApplicationError(ContractorBoqErrorCode.ALLOCATION_FAILED, result.error),
      );
    }

    boq.replaceItemsFromState(result.nextItems);
    await this.contractorBoq.save(boq);
    return Result.ok(toResult(boq.items));
  }
}

/** Mirrors updateContractorItemQuantity */
export class UpdateContractorItemQuantityUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(
    input: UpdateContractorItemQuantityInput,
  ): Promise<Result<ContractorBoqItemResult[]>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const contractorId = new UniqueEntityId(input.contractorId);

    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const finalItem = await toFinalItemForAllocation(
      buildingId,
      input.itemCode,
      this.finalBoq,
      this.contractorBoq,
      this.buildings,
    );
    if (!finalItem) {
      return Result.fail(
        new ContractorBoqApplicationError(
          ContractorBoqErrorCode.FINAL_ITEM_NOT_FOUND,
          'البند غير موجود',
        ),
      );
    }

    const boq = await this.contractorBoq.findByBuildingAndSubcontractor(buildingId, contractorId);
    if (!boq) {
      return Result.fail(
        new ContractorBoqApplicationError(
          ContractorBoqErrorCode.ITEM_NOT_FOUND,
          'Contractor BOQ not found',
        ),
      );
    }

    const allBoqs = await this.contractorBoq.findByBuildingId(buildingId);
    const allAllocations = allBoqs.flatMap((b) =>
      b.items.map((i) => ({
        contractorId: b.subcontractorId.toValue(),
        itemCode: i.itemCode,
        componentId: i.componentId?.toValue() ?? undefined,
        assignedQuantity: i.assignedQuantity,
      })),
    );

    const result = updateContractorItemQuantity(
      finalItem,
      allAllocations,
      input.contractorId,
      input.itemCode,
      input.componentId,
      input.quantity,
      boq.toItemStates(),
    );

    if (!result.ok) {
      return Result.fail(
        new ContractorBoqApplicationError(ContractorBoqErrorCode.ALLOCATION_FAILED, result.error),
      );
    }

    boq.replaceItemsFromState(result.nextItems);
    await this.contractorBoq.save(boq);
    return Result.ok(toResult(boq.items));
  }
}

/** Mirrors removeContractorItem */
export class RemoveContractorItemUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(
    buildingId: string,
    contractorId: string,
    itemCode: string,
    componentId?: string,
  ): Promise<Result<void>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const boq = await this.contractorBoq.findByBuildingAndSubcontractor(
      new UniqueEntityId(buildingId),
      new UniqueEntityId(contractorId),
    );
    if (!boq) return Result.ok();

    boq.removeItem(itemCode, componentId);
    await this.contractorBoq.save(boq);
    return Result.ok();
  }
}

/** Mirrors getAvailableQtyForContractorItem */
export class GetAvailableContractorQtyUseCase {
  constructor(
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly finalBoq: IFinalBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(input: {
    buildingId: string;
    contractorId: string;
    itemCode: string;
    componentId?: string;
  }): Promise<Result<number>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const finalItem = await toFinalItemForAllocation(
      buildingId,
      input.itemCode,
      this.finalBoq,
      this.contractorBoq,
      this.buildings,
    );

    const allBoqs = await this.contractorBoq.findByBuildingId(buildingId);
    const allAllocations = allBoqs.flatMap((b) =>
      b.items.map((i) => ({
        contractorId: b.subcontractorId.toValue(),
        itemCode: i.itemCode,
        componentId: i.componentId?.toValue() ?? undefined,
        assignedQuantity: i.assignedQuantity,
      })),
    );

    return Result.ok(
      getAvailableQtyForContractorItem(
        finalItem,
        allAllocations,
        input.contractorId,
        input.itemCode,
        input.componentId,
      ),
    );
  }
}
