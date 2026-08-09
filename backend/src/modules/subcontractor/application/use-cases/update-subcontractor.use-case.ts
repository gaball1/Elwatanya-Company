import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorRepository } from '../../domain/subcontractor.repository';
import { UpdateSubcontractorInput, SubcontractorResult } from '../dto/subcontractor.dto';
import { toResult } from './list-subcontractors.use-case';

export class UpdateSubcontractorUseCase {
  constructor(private readonly subcontractors: ISubcontractorRepository) {}

  async execute(input: UpdateSubcontractorInput): Promise<Result<SubcontractorResult>> {
    const sub = await this.subcontractors.findById(new UniqueEntityId(input.id));
    if (!sub) {
      return Result.fail(new Error('Subcontractor not found'));
    }

    const updateResult = sub.update({
      name: input.name,
      workType: input.workType,
      marginType: input.marginType,
      marginValue: input.marginValue,
      phone: input.phone,
      email: input.email,
      address: input.address,
      joinDate: input.joinDate,
      status: input.status,
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error as Error);
    }

    await this.subcontractors.save(sub);
    return Result.ok(toResult(sub));
  }
}
