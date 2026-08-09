import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ICategoryRepository } from '../../domain/category.repository';
import { CategoryResult } from '../dto/category.dto';
import { toResult } from './list-categories.use-case';

export class GetCategoryUseCase {
  constructor(private readonly categories: ICategoryRepository) {}

  async execute(id: string): Promise<Result<CategoryResult | null>> {
    const category = await this.categories.findById(new UniqueEntityId(id));
    if (!category) return Result.ok(null);
    return Result.ok(toResult(category));
  }
}
