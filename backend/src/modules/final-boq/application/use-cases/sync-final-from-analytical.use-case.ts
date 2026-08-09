import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IAnalyticalBoqRepository } from '@/modules/analytical-boq/domain/analytical-boq.repository';
import { FinalBoqItem } from '../../domain/final-boq-item.entity';
import {
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from '../../domain/final-boq.repository';
import { syncFinalFromAnalytical } from '../../domain/final-boq-rules';
import { SyncFinalFromAnalyticalInput, FinalBoqItemResult } from '../dto/final-boq.dto';
import { getOrCreateFinalBoq, toFinalBoqItemResult, toItemStateInput } from './final-boq-mappers';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';

/**
 * Mirrors syncFinalFromAnalytical — called whenever analytical BOQ changes
 * (setAnalyticalItems / updateAnalyticalItem / removeAnalyticalItem).
 */
export class SyncFinalFromAnalyticalUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly allocations: IFinalBoqAllocationReader,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SyncFinalFromAnalyticalInput, userProjectId?: string | null, userId?: string): Promise<Result<FinalBoqItemResult[]>> {
    await this.ownership.verifyBuildingAccess(userProjectId, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const analyticalItems = await this.analyticalBoq.findByBuildingId(buildingId);
    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const allocationRefs = await this.allocations.getAllocationsForBuilding(buildingId);

    const next = syncFinalFromAnalytical(
      analyticalItems.map((a) => ({
        itemCode: a.itemCode,
        description: a.description,
        unit: a.unit,
        quantity: a.quantity,
        unitPrice: a.unitPrice,
        totalValue: a.totalValue,
      })),
      aggregate.items.map(toItemStateInput),
      allocationRefs,
    );

    const nextCodes = new Set(next.map((n) => n.itemCode));

    for (const existing of aggregate.items) {
      if (!nextCodes.has(existing.itemCode)) {
        existing.softDelete();
      }
    }

    for (let i = 0; i < next.length; i++) {
      const state = next[i];
      const existing = aggregate.findItemByCode(state.itemCode);

      if (existing) {
        existing.setState({
          description: state.description,
          unit: state.unit,
          quantity: state.quantity,
          unitPrice: state.unitPrice,
          totalValue: state.totalValue,
          itemStatus: state.status,
          isAnalyzed: state.isAnalyzed,
        });

        // Preserve component ids; scale quantities (frontend maps existing.components)
        for (const compState of state.components) {
          const comp = existing.findComponent(new UniqueEntityId(compState.id));
          if (comp) {
            comp.applyScaledQuantity(compState.quantity);
          }
        }
      } else {
        aggregate.addItem(
          FinalBoqItem.fromSourceItem({
            finalBoqId: aggregate.id,
            itemCode: state.itemCode,
            description: state.description,
            unit: state.unit,
            quantity: state.quantity,
            unitPrice: state.unitPrice,
            totalValue: state.totalValue,
            sortOrder: i,
          }),
        );
      }
    }

    await this.finalBoq.save(aggregate);

    if (userId) {
      this.audit.log({ userId, entity: 'final_boq', entityId: buildingId.toValue(), action: 'SYNC_FROM_ANALYTICAL', before: null, after: { itemCount: next.length } });
    }

    const fresh = await this.finalBoq.findByBuildingId(buildingId);
    const items = (fresh?.items ?? []).map((item) => toFinalBoqItemResult(item, allocationRefs));
    return Result.ok(items);
  }
}
