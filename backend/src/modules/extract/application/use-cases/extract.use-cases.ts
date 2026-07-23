import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { ContractorBoq } from '@/modules/contractor-boq/domain/contractor-boq.entity';
import { Extract } from '../../domain/extract.entity';
import { IExtractRepository } from '../../domain/extract.repository';
import {
  calcExtractItem,
  getPreviousQuantitiesFromExtracts,
  nextRunningNumber,
  validateExtractItems,
  ExtractDeduction,
  ExtractStatus,
} from '../../domain/extract-rules';

export interface ExtractResult {
  id: string;
  buildingId: string;
  contractorId: string;
  contractorBoqId: string;
  date: string;
  status: ExtractStatus;
  runningNumber?: number | null;
  label: string | null;
  insurancePercent: number;
  items: ReturnType<typeof calcExtractItem>[];
  deductions: ExtractDeduction[];
  totalWorkValue: number;
  previousPaid: number;
  totalDeductions: number;
  netPayable: number;
}

export interface SaveExtractInput {
  id?: string;
  buildingId: string;
  contractorId: string;
  status: ExtractStatus;
  runningNumber?: number;
  label?: string;
  insurancePercent: number;
  date: string;
  previousPaid: number;
  items: {
    itemCode: string;
    description: string;
    unit: string;
    contractQuantity: number;
    previous: number;
    current: number;
    executionPercent: number;
    unitPrice: number;
  }[];
  manualDeductions?: ExtractDeduction[];
}

function toResult(
  extract: Extract,
  buildingId: string,
  contractorId: string,
): ExtractResult {
  return {
    id: extract.id.toValue(),
    buildingId,
    contractorId,
    contractorBoqId: extract.contractorBoqId.toValue(),
    date: extract.extractDate.toISOString(),
    status: extract.status,
    runningNumber: extract.runningNumber,
    label: extract.label,
    insurancePercent: extract.insurancePercent,
    items: extract.items.map(({ contractorBoqItemId: _, ...item }) => item),
    deductions: extract.allDeductions(),
    totalWorkValue: extract.totalWorkValue,
    previousPaid: extract.previousPaid,
    totalDeductions: extract.totalDeductions,
    netPayable: extract.netPayable,
  };
}

async function resolveContractorBoq(
  buildingId: UniqueEntityId,
  contractorId: UniqueEntityId,
  repo: IContractorBoqRepository,
): Promise<ContractorBoq | null> {
  return repo.findByBuildingAndSubcontractor(buildingId, contractorId);
}

export class ListExtractsUseCase {
  constructor(
    private readonly extracts: IExtractRepository,
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(buildingId: string, contractorId: string): Promise<Result<ExtractResult[]>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const boq = await resolveContractorBoq(
      new UniqueEntityId(buildingId),
      new UniqueEntityId(contractorId),
      this.contractorBoq,
    );
    if (!boq) return Result.ok([]);

    const list = await this.extracts.findByContractorBoqId(boq.id);
    return Result.ok(list.map((e) => toResult(e, buildingId, contractorId)));
  }
}

export class GetExtractMetaUseCase {
  constructor(
    private readonly extracts: IExtractRepository,
    private readonly contractorBoq: IContractorBoqRepository,
  ) {}

  async execute(input: {
    buildingId: string;
    contractorId: string;
    status: ExtractStatus;
    runningNumber?: number;
  }): Promise<
    Result<{ previousPaid: number; previousQuantities: Record<string, number>; nextRunning: number }>
  > {
    const boq = await resolveContractorBoq(
      new UniqueEntityId(input.buildingId),
      new UniqueEntityId(input.contractorId),
      this.contractorBoq,
    );
    if (!boq) {
      return Result.ok({ previousPaid: 0, previousQuantities: {}, nextRunning: 1 });
    }

    const list = await this.extracts.findByContractorBoqId(boq.id);
    const snapshots = list.map((e) => ({
      status: e.status,
      runningNumber: e.runningNumber ?? undefined,
      items: e.items.map((i) => ({ itemCode: i.itemCode, total: i.total })),
      netPayable: e.netPayable,
    }));

    const previousQuantities = getPreviousQuantitiesFromExtracts(
      snapshots,
      input.status,
      input.runningNumber,
    );

    // Previous paid = sum of netPayable of prior running extracts (frontend finance meta pattern)
    const previousPaid = list
      .filter(
        (e) =>
          e.status === 'running' &&
          (e.runningNumber ?? 0) < (input.runningNumber ?? nextRunningNumber(snapshots)),
      )
      .reduce((s, e) => s + e.netPayable, 0);

    return Result.ok({
      previousPaid,
      previousQuantities,
      nextRunning: nextRunningNumber(snapshots),
    });
  }
}

export class SaveExtractUseCase {
  constructor(
    private readonly extracts: IExtractRepository,
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(input: SaveExtractInput): Promise<Result<ExtractResult>> {
    const buildingId = new UniqueEntityId(input.buildingId);
    const contractorId = new UniqueEntityId(input.contractorId);

    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    let boq = await resolveContractorBoq(buildingId, contractorId, this.contractorBoq);
    if (!boq) {
      boq = ContractorBoq.create({ buildingId, subcontractorId: contractorId });
      await this.contractorBoq.save(boq);
      boq = (await resolveContractorBoq(buildingId, contractorId, this.contractorBoq))!;
    }

    const calculated = input.items.map((i) => calcExtractItem(i));
    const validation = validateExtractItems(
      calculated,
      boq.items.map((i) => ({ itemCode: i.itemCode, assignedQuantity: i.assignedQuantity })),
    );
    if (!validation.ok) {
      return Result.fail(new Error(validation.error));
    }

    const itemsWithIds: (typeof input.items[number] & { contractorBoqItemId: string })[] = [];
    for (const item of input.items) {
      const boqItem =
        boq.items.find((i) => i.itemCode === item.itemCode && !i.componentId) ??
        boq.items.find((i) => i.itemCode === item.itemCode);
      if (!boqItem) {
        return Result.fail(new Error(`Contractor BOQ item not found for ${item.itemCode}`));
      }
      itemsWithIds.push({ ...item, contractorBoqItemId: boqItem.id.toValue() });
    }

    if (input.id) {
      const existing = await this.extracts.findById(new UniqueEntityId(input.id));
      if (!existing) {
        return Result.fail(new Error('Extract not found'));
      }
      existing.replaceContent({
        status: input.status,
        label: input.label ?? null,
        insurancePercent: input.insurancePercent,
        extractDate: new Date(input.date),
        previousPaid: input.previousPaid,
        items: itemsWithIds,
        manualDeductions: input.manualDeductions ?? [],
      });
      await this.extracts.save(existing);
      return Result.ok(toResult(existing, input.buildingId, input.contractorId));
    }

    const extract = Extract.create({
      contractorBoqId: boq.id,
      status: input.status,
      runningNumber: input.runningNumber ?? null,
      label: input.label ?? null,
      insurancePercent: input.insurancePercent,
      extractDate: new Date(input.date),
      previousPaid: input.previousPaid,
      items: itemsWithIds,
      manualDeductions: input.manualDeductions ?? [],
    });
    await this.extracts.save(extract);
    return Result.ok(toResult(extract, input.buildingId, input.contractorId));
  }
}

export class GetExtractByIdUseCase {
  constructor(
    private readonly extracts: IExtractRepository,
    private readonly contractorBoq: IContractorBoqRepository,
  ) {}

  async execute(
    buildingId: string,
    contractorId: string,
    extractId: string,
  ): Promise<Result<ExtractResult | null>> {
    const extract = await this.extracts.findById(new UniqueEntityId(extractId));
    if (!extract) return Result.ok(null);
    return Result.ok(toResult(extract, buildingId, contractorId));
  }
}

export class DeleteExtractUseCase {
  constructor(private readonly extracts: IExtractRepository) {}

  async execute(extractId: string): Promise<Result<void>> {
    await this.extracts.delete(new UniqueEntityId(extractId));
    return Result.ok();
  }
}
