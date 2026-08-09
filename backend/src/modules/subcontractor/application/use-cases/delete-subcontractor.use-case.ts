import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorRepository } from '../../domain/subcontractor.repository';

export class DeleteSubcontractorUseCase {
  constructor(private readonly subcontractors: ISubcontractorRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const sub = await this.subcontractors.findById(new UniqueEntityId(id));
    if (!sub) {
      return Result.fail(new Error('Subcontractor not found'));
    }

    const deleteResult = sub.softDelete();
    if (deleteResult.isFailure) {
      return Result.fail(deleteResult.error as Error);
    }

    await this.subcontractors.save(sub);
    return Result.ok();
  }
}
