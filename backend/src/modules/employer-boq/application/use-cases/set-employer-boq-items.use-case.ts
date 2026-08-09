import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { EmployerBoqItem } from '../../domain/employer-boq-item.entity';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { SetEmployerBoqItemsInput, EmployerBoqItemResult } from '../dto/employer-boq.dto';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from '../errors/employer-boq-application.error';
import { toEmployerBoqItemResult } from './list-employer-boq-items.use-case';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { BOQUploadedEvent } from '@/modules/domain-events/events';

export class SetEmployerBoqItemsUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: SetEmployerBoqItemsInput, userProjectId?: string | null, userId?: string): Promise<Result<EmployerBoqItemResult[]>> {
    await this.ownership.verifyBuildingAccess(userProjectId, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const codes = new Set<string>();
    const domainItems: EmployerBoqItem[] = [];

    for (const item of input.items) {
      if (codes.has(item.itemCode)) {
        return Result.fail(
          new EmployerBoqApplicationError(
            EmployerBoqErrorCode.DUPLICATE_ITEM_CODE,
            `Duplicate item code in request: ${item.itemCode}`,
          ),
        );
      }
      codes.add(item.itemCode);

      const created = EmployerBoqItem.create({
        buildingId,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      if (created.isFailure) {
        return Result.fail(
          new EmployerBoqApplicationError(
            EmployerBoqErrorCode.INVALID_ITEM,
            created.error?.message ?? 'Invalid employer BOQ item',
          ),
        );
      }
      domainItems.push(created.getValue());
    }

    await this.employerBoq.replaceAllForBuilding(buildingId, domainItems);
    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: input.buildingId, action: 'REPLACE_ALL', before: null, after: { items: domainItems.map(i => ({ itemCode: i.itemCode, description: i.description })) } });
    }
    await this.eventBus.publish(
      new BOQUploadedEvent(
        input.buildingId,
        'boq',
        {
          id: input.buildingId,
          buildingId: input.buildingId,
          boqType: 'employer',
          itemCount: domainItems.length,
          uploadedBy: userId,
        },
      ),
    );
    return Result.ok(domainItems.map(toEmployerBoqItemResult));
  }
}
