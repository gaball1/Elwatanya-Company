import { Result } from '@/shared/kernel/result';
import { IBuildingRepository } from '../../domain/building.repository';
import { BuildingResult } from '../dto/building.dto';
import { toBuildingResult } from './create-building.use-case';

export class ListAllBuildingsUseCase {
  constructor(private readonly buildings: IBuildingRepository) {}

  async execute(): Promise<Result<BuildingResult[]>> {
    const buildings = await this.buildings.findAll();
    return Result.ok(buildings.map(toBuildingResult));
  }
}
