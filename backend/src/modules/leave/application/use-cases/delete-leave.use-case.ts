import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ILeaveRepository } from '../../domain/leave.repository';

export class DeleteLeaveUseCase {
  constructor(private readonly leaves: ILeaveRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const leave = await this.leaves.findById(new UniqueEntityId(id));
    if (!leave) return Result.fail(new Error('Leave not found'));

    const deleteResult = leave.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.leaves.save(leave);
    return Result.ok();
  }
}
