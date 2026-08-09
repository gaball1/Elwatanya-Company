import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Inject } from '@nestjs/common';
import { SUBCONTRACTOR_REPOSITORY, ISubcontractorRepository } from '../../domain/subcontractor.repository';
import { Subcontractor } from '../../domain/subcontractor.entity';

export class GetSubcontractorUseCase {
  constructor(
    @Inject(SUBCONTRACTOR_REPOSITORY)
    private readonly repo: ISubcontractorRepository,
  ) {}

  async execute(id: string): Promise<Result<Subcontractor>> {
    const sub = await this.repo.findById(new UniqueEntityId(id));
    if (!sub) {
      return Result.fail(new Error('Subcontractor not found'));
    }
    return Result.ok(sub);
  }
}
