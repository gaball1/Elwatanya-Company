import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import { AnalyticalBoqItem } from '../../domain/analytical-boq-item.entity';
import { IAnalyticalBoqRepository } from '../../domain/analytical-boq.repository';
import {
  ImportAnalyticalFromEmployerInput,
  AnalyticalBoqItemResult,
} from '../dto/analytical-boq.dto';
import {
  AnalyticalBoqApplicationError,
  AnalyticalBoqErrorCode,
} from '../errors/analytical-boq-application.error';
import { toAnalyticalBoqItemResult } from './list-analytical-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';

export class ImportAnalyticalFromEmployerUseCase {
  constructor(
    private readonly analyticalBoq: IAnalyticalBoqRepository,
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncFinalFromAnalytical: SyncFinalFromAnalyticalUseCase,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: ImportAnalyticalFromEmployerInput,
    user?: OwnershipActor,
    userId?: string,
  ): Promise<Result<AnalyticalBoqItemResult | null>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const existing = await this.analyticalBoq.findByBuildingIdAndItemCode(buildingId, input.itemCode);
    if (existing) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.ALREADY_IMPORTED,
          'Item already exists in analytical BOQ',
        ),
      );
    }

    const employerItem = await this.employerBoq.findByBuildingIdAndItemCode(
      buildingId,
      input.itemCode,
    );
    if (!employerItem) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.EMPLOYER_ITEM_NOT_FOUND,
          'Employer BOQ item not found',
        ),
      );
    }

    const created = AnalyticalBoqItem.createFromEmployer({
      buildingId,
      itemCode: employerItem.itemCode,
      description: employerItem.description,
      unit: employerItem.unit,
      quantity: employerItem.quantity,
      unitPrice: employerItem.unitPrice,
      totalValue: employerItem.totalValue,
    });
    if (created.isFailure) {
      return Result.fail(
        new AnalyticalBoqApplicationError(
          AnalyticalBoqErrorCode.INVALID_ITEM,
          created.error?.message ?? 'Invalid analytical BOQ item',
        ),
      );
    }

    const item = created.getValue();
    await this.analyticalBoq.save(item);
    // Mirrors importAnalyticalFromEmployer → setAnalyticalItems → syncFinalFromAnalytical
    await this.syncFinalFromAnalytical.execute({ buildingId: input.buildingId }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'analytical_boq', entityId: item.id.toValue(), action: 'IMPORT', before: null, after: { itemCode: item.itemCode, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice } });
    }
    return Result.ok(toAnalyticalBoqItemResult(item));
  }
}
