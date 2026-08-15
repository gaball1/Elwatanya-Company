import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { NotificationService } from '@/common/services/notification.service';
import { ISubcontractorContractRepository } from '../../domain/subcontractor-contract.repository';
import {
  SubcontractorContract,
  ContractStatus,
} from '../../domain/subcontractor-contract.entity';
import {
  CreateSubcontractorContractInput,
  SubcontractorContractResult,
  UpdateSubcontractorContractInput,
} from '../dto/subcontractor-contract.dto';

export function toResult(c: SubcontractorContract): SubcontractorContractResult {
  return {
    id: c.id.toValue(),
    contractNumber: c.contractNumber,
    buildingId: c.buildingId,
    subcontractorId: c.subcontractorId,
    title: c.title,
    startDate: c.startDate,
    endDate: c.endDate,
    totalValue: c.totalValue,
    terms: c.terms,
    notes: c.notes,
    status: c.status,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function generateContractNumber(
  repo: ISubcontractorContractRepository,
): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await repo.findAll();
  const sequence = existing.length + 1;
  return `CTR-${year}-${String(sequence).padStart(4, '0')}`;
}

export class CreateSubcontractorContractUseCase {
  constructor(
    private readonly contracts: ISubcontractorContractRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(
    input: CreateSubcontractorContractInput,
  ): Promise<Result<SubcontractorContractResult>> {
    const contractNumber = await generateContractNumber(this.contracts);

    const result = SubcontractorContract.create({
      contractNumber,
      buildingId: input.buildingId,
      subcontractorId: input.subcontractorId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      totalValue: input.totalValue,
      terms: input.terms,
      notes: input.notes,
      status: input.status as ContractStatus,
      createdBy: input.createdBy,
    });

    if (result.isFailure) {
      return Result.fail(result.error as Error);
    }

    const contract = result.getValue();
    await this.contracts.save(contract);

    await this.notifications.createForAllUsers({
      title: 'تم إنشاء عقد جديد',
      titleEn: 'New Contract Created',
      message: `تم إنشاء العقد رقم ${contract.contractNumber}`,
      messageEn: `Contract ${contract.contractNumber} was created`,
      type: 'info',
      entityType: 'subcontractor-contract',
      entityId: contract.id.toValue(),
      link: '/subcontractors',
      createdBy: input.createdBy,
    });

    return Result.ok(toResult(contract));
  }
}

export class UpdateSubcontractorContractUseCase {
  constructor(private readonly contracts: ISubcontractorContractRepository) {}

  async execute(
    input: UpdateSubcontractorContractInput,
  ): Promise<Result<SubcontractorContractResult>> {
    const existing = await this.contracts.findById(new UniqueEntityId(input.id));
    if (!existing) {
      return Result.fail(new Error('Contract not found'));
    }

    const result = existing.update({
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      totalValue: input.totalValue,
      terms: input.terms,
      notes: input.notes,
      status: input.status as ContractStatus,
    });
    if (result.isFailure) {
      return Result.fail(result.error as Error);
    }

    await this.contracts.save(existing);
    return Result.ok(toResult(existing));
  }
}

export class DeleteSubcontractorContractUseCase {
  constructor(private readonly contracts: ISubcontractorContractRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const existing = await this.contracts.findById(new UniqueEntityId(id));
    if (!existing) {
      return Result.fail(new Error('Contract not found'));
    }

    const result = existing.softDelete();
    if (result.isFailure) {
      return Result.fail(result.error as Error);
    }

    await this.contracts.delete(new UniqueEntityId(id));
    return Result.ok();
  }
}

export class ListSubcontractorContractsUseCase {
  constructor(private readonly contracts: ISubcontractorContractRepository) {}

  async execute(
    buildingId?: string,
    subcontractorId?: string,
  ): Promise<Result<SubcontractorContractResult[]>> {
    const list = buildingId && subcontractorId
      ? await this.contracts.findByBuildingSubcontractor(buildingId, subcontractorId)
      : await this.contracts.findAll();
    return Result.ok(list.map(toResult));
  }
}

export class GetSubcontractorContractUseCase {
  constructor(private readonly contracts: ISubcontractorContractRepository) {}

  async execute(id: string): Promise<Result<SubcontractorContractResult | null>> {
    const contract = await this.contracts.findById(new UniqueEntityId(id));
    return Result.ok(contract ? toResult(contract) : null);
  }
}
