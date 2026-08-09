import { Result } from '@/shared/kernel/result';
import { ISubcontractorRepository } from '../../domain/subcontractor.repository';
import { SubcontractorResult } from '../dto/subcontractor.dto';
import { Subcontractor } from '../../domain/subcontractor.entity';

export function toResult(s: Subcontractor): SubcontractorResult {
  return {
    id: s.id.toValue(),
    name: s.name,
    workType: s.workType,
    marginType: s.marginType,
    marginValue: s.marginValue,
    phone: s.phone,
    email: s.email,
    address: s.address,
    joinDate: s.joinDate,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export class ListSubcontractorsUseCase {
  constructor(private readonly subcontractors: ISubcontractorRepository) {}

  async execute(): Promise<Result<SubcontractorResult[]>> {
    const list = await this.subcontractors.findAll();
    return Result.ok(list.map(toResult));
  }
}
