import { Project } from './project.entity';
import { ProjectCode } from './value-objects/project-code.vo';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface IProjectRepository {
  save(project: Project): Promise<void>;
  findById(id: UniqueEntityId): Promise<Project | null>;
  findByCode(code: ProjectCode): Promise<Project | null>;
  existsByCode(code: ProjectCode): Promise<boolean>;
  findAll(): Promise<Project[]>;
}
