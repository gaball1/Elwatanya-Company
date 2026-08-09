import { Result } from '@/shared/kernel/result';
import { ICategoryRepository } from '../../domain/category.repository';
import { CreateCategoryInput, CategoryResult } from '../dto/category.dto';
import { Category } from '../../domain/category.entity';
import { toResult } from './list-categories.use-case';

export class CreateCategoryUseCase {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Result<CategoryResult>> {
    const result = Category.create({
      code: input.code,
      name: input.name,
      description: input.description,
      parentId: input.parentId,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const category = result.getValue();
    await this.categories.save(category);
    return Result.ok(toResult(category));
  }
}
