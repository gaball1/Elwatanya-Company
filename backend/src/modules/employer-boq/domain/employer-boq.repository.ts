import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { EmployerBoqItem } from './employer-boq-item.entity';

export const EMPLOYER_BOQ_REPOSITORY = Symbol('EMPLOYER_BOQ_REPOSITORY');

export interface IEmployerBoqRepository {
  save(item: EmployerBoqItem): Promise<void>;
  replaceAllForBuilding(buildingId: UniqueEntityId, items: EmployerBoqItem[]): Promise<void>;
  findByBuildingId(buildingId: UniqueEntityId): Promise<EmployerBoqItem[]>;
  findByBuildingIdAndItemCode(
    buildingId: UniqueEntityId,
    itemCode: string,
  ): Promise<EmployerBoqItem | null>;
  findByBuildingIdDescriptionAndUnit(
    buildingId: UniqueEntityId,
    description: string,
    unit: string,
  ): Promise<EmployerBoqItem | null>;
  generateNextItemCode(buildingId: UniqueEntityId): Promise<string>;
}
