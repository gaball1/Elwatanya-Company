import { Result } from '@/shared/kernel/result';
import { IProjectRepository } from '../../domain/project.repository';
import { ProjectResult } from '../dto/project.result';
import { toProjectResult } from './create-project.use-case';

export class ListProjectsUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(): Promise<Result<ProjectResult[]>> {
    const projects = await this.projects.findAll();
    return Result.ok(projects.map(toProjectResult));
  }
}
