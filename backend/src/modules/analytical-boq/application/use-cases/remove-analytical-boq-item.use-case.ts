import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from '../errors/analytical-boq-application.error';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { isFinalItemCommittedForItem } from './analytical-boq.guards';

export class RemoveAnalyticalBoqItemUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
    private readonly finalBoq: IFinalBoqRepository,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(buildingId: string, itemCode: string, user?: OwnershipActor, userId?: string): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
    const buildingEntityId = new UniqueEntityId(buildingId);
    const building = await this.buildings.findById(buildingEntityId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const existing = await this.analyticalBoq.findByBuildingIdAndItemCode(buildingEntityId, itemCode);
    if (!existing) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.ITEM_NOT_FOUND,
          'Analytical BOQ item not found',
        ),
      );
    }

    const before = { itemCode: existing.itemCode, description: existing.description, unit: existing.unit, quantity: existing.quantity, unitPrice: existing.unitPrice };
    if (await isFinalItemCommittedForItem(this.finalBoq, buildingEntityId, existing.itemCode)) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.QUANTITY_CANNOT_DECREASE,
          `لا يمكن حذف البند ${existing.itemCode} بعد تحليله أو توزيعه`,
        ),
      );
    }
    await this.analyticalBoq.deleteByItemCode(buildingEntityId, itemCode);
    // Mirrors removeAnalyticalItem → setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'analytical_boq', entityId: existing.id.toValue(), action: 'DELETE', before, after: null });
    }
    return Result.ok();
  }
}
