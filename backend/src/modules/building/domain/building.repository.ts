import { Building } from './building.entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export const BUILDING_REPOSITORY = Symbol('BUILDING_REPOSITORY');

export interface IBuildingRepository {
  save(building: Building): Promise<void>;
  findById(id: UniqueEntityId): Promise<Building | null>;
  findByProjectId(projectId: UniqueEntityId): Promise<Building[]>;
  existsByNameInProject(
    projectId: UniqueEntityId,
    name: string,
    excludeBuildingId?: UniqueEntityId,
  ): Promise<boolean>;
}
