import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import { SetAnalyticalBoqItemsInput, AnalyticalBoqItemResult } from '../dto/analytical-boq.dto';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from '../errors/analytical-boq-application.error';
import { toAnalyticalBoqItemResult } from './list-analytical-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { isFinalItemCommittedForItem } from './analytical-boq.guards';

export class SetAnalyticalBoqItemsUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
    private readonly finalBoq: IFinalBoqRepository,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SetAnalyticalBoqItemsInput, user?: OwnershipActor, userId?: string): Promise<Result<AnalyticalBoqItemResult[]>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const codes = new Set<string>();
    const domainItems: AnalyticalBoqItem[] = [];

    for (const item of input.items) {
      if (codes.has(item.itemCode)) {
        return Result.fail(
          new AnalyticalBoqApplicationError(
            AnalyticalBoqErrorCode.DUPLICATE_ITEM_CODE,
            `Duplicate item code in request: ${item.itemCode}`,
          ),
        );
      }
      codes.add(item.itemCode);

      const created = AnalyticalBoqItem.create({
        buildingId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      if (created.isFailure) {
        return Result.fail(
          new AnalyticalBoqApplicationError(
            AnalyticalBoqErrorCode.INVALID_ITEM,
            created.error?.message ?? 'Invalid analytical BOQ item',
          ),
        );
      }
      domainItems.push(created.getValue());
    }

    const existingItems = await this.analyticalBoq.findByBuildingId(buildingId);
    const cachedAggregate = await this.finalBoq.findByBuildingId(buildingId);
    for (const existing of existingItems) {
      const incoming = domainItems.find((d) => d.itemCode === existing.itemCode);
      if (
        (incoming === undefined || incoming.quantity < existing.quantity) &&
        (await isFinalItemCommittedForItem(this.finalBoq, buildingId, existing.itemCode, cachedAggregate))
      ) {
        return Result.fail(
          new AnalyticalBoqApplicationError(
            AnalyticalBoqErrorCode.QUANTITY_CANNOT_DECREASE,
            incoming === undefined
              ? `لا يمكن حذف البند ${existing.itemCode} بعد تحليله أو توزيعه`
              : `لا يمكن تقليل كمية البند ${existing.itemCode} بعد تحليله أو توزيعه`,
          ),
        );
      }
    }

    await this.analyticalBoq.replaceAllForBuilding(buildingId, domainItems);
    // Mirrors setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'analytical_boq', entityId: input.buildingId, action: 'REPLACE_ALL', before: null, after: { items: domainItems.map(i => ({ itemCode: i.itemCode, description: i.description })) } });
    }
    return Result.ok(domainItems.map(toAnalyticalBoqItemResult));
  }
}
