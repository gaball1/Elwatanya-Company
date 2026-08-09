import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ICategoryRepository } from '../../domain/category.repository';
import { UpdateCategoryInput, CategoryResult } from '../dto/category.dto';
import { toResult } from './list-categories.use-case';

export class UpdateCategoryUseCase {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(input: UpdateCategoryInput): Promise<Result<CategoryResult>> {
    const category = await this.categories.findById(new UniqueEntityId(input.id));
    if (!category) return Result.fail(new Error('Category not found'));

    const updateResult = category.update({
      code: input.code,
      name: input.name,
      description: input.description,
      parentId: input.parentId,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.categories.save(category);
    return Result.ok(toResult(category));
  }
}
