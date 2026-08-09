import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IMiscellaneousRepository } from '../../domain/miscellaneous.repository';
import { UpdateMiscellaneousInput, MiscellaneousResult } from '../dto/miscellaneous.dto';
import { toResult } from './list-miscellaneous.use-case';

export class UpdateMiscellaneousUseCase {
  constructor(private readonly miscellaneous: IMiscellaneousRepository) {}

  async execute(input: UpdateMiscellaneousInput): Promise<Result<MiscellaneousResult>> {
    const miscellaneous = await this.miscellaneous.findById(new UniqueEntityId(input.id));
    if (!miscellaneous) return Result.fail(new Error('Miscellaneous record not found'));

    const updateResult = miscellaneous.update({
      description: input.description,
      amount: input.amount,
      category: input.category,
      date: input.date,
      notes: input.notes,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.miscellaneous.save(miscellaneous);
    return Result.ok(toResult(miscellaneous));
  }
}
