import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Category } from './category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface ICategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: UniqueEntityId): Promise<Category | null>;
  findAll(): Promise<Category[]>;
}
