import { Result } from '@/shared/kernel/result';
import { ISubcontractorRepository } from '../../domain/subcontractor.repository';

export interface SubcontractorResult {
  id: string;
  name: string;
}

export class ListSubcontractorsUseCase {
  constructor(private readonly subcontractors: ISubcontractorRepository) {}

  async execute(): Promise<Result<SubcontractorResult[]>> {
    const list = await this.subcontractors.findAll();
    return Result.ok(
      list.map((s) => ({
        id: s.id.toValue(),
        name: s.name,
      })),
    );
  }
}
