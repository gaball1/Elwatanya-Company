import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { AnalyticalBoqItem } from './analytical-boq-item.entity';

export const ANALYTICAL_BOQ_REPOSITORY = Symbol('ANALYTICAL_BOQ_REPOSITORY');

export interface IAnalyticalBoqRepository {
  save(item: AnalyticalBoqItem): Promise<void>;
  replaceAllForBuilding(buildingId: UniqueEntityId, items: AnalyticalBoqItem[]): Promise<void>;
  findByBuildingId(buildingId: UniqueEntityId): Promise<AnalyticalBoqItem[]>;
  findByBuildingIdAndItemCode(
    buildingId: UniqueEntityId,
    itemCode: string,
  ): Promise<AnalyticalBoqItem | null>;
  deleteByItemCode(buildingId: UniqueEntityId, itemCode: string): Promise<void>;
}
