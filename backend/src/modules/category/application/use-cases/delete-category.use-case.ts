import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ICategoryRepository } from '../../domain/category.repository';

export class DeleteCategoryUseCase {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const category = await this.categories.findById(new UniqueEntityId(id));
    if (!category) return Result.fail(new Error('Category not found'));

    const deleteResult = category.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.categories.save(category);
    return Result.ok();
  }
}
