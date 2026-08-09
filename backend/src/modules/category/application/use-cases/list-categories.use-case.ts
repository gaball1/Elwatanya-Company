import { Result } from '@/shared/kernel/result';
import { Category } from '../../domain/category.entity';
import { CategoryResult } from '../dto/category.dto';

export function toResult(c: Category): CategoryResult {
  return {
    id: c.id.toValue(),
    code: c.code,
    name: c.name,
    description: c.description,
    parentId: c.parentId,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListCategoriesUseCase {
  constructor(private readonly categories: import('../../domain/category.repository').ICategoryRepository) {}

  async execute(): Promise<Result<CategoryResult[]>> {
    const list = await this.categories.findAll();
    return Result.ok(list.map(toResult));
  }
}
