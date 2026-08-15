import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { isFinalItemCommitted } from '@/modules/final-boq/domain/final-boq-rules';

/**
 * True when the final BOQ item for the given analytical item has already been
 * analyzed or distributed, and therefore its quantity can no longer be
 * decreased from the analytical BOQ side.
 */
export async function isFinalItemCommittedForItem(
  finalBoq: IFinalBoqRepository,
  buildingId: UniqueEntityId,
  itemCode: string,
): Promise<boolean> {
  const aggregate = await finalBoq.findByBuildingId(buildingId);
  if (!aggregate) return false;
  const item = aggregate.findItemByCode(itemCode);
  return isFinalItemCommitted(item ?? undefined);
}
