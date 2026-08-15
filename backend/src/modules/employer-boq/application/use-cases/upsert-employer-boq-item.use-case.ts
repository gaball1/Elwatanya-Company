import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { EmployerBoqItem } from '../../domain/employer-boq-item.entity';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { UpsertEmployerBoqItemInput, EmployerBoqItemResult } from '../dto/employer-boq.dto';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from '../errors/employer-boq-application.error';
import { toEmployerBoqItemResult } from './list-employer-boq-items.use-case';
import { SyncAnalyticalFromEmployerUseCase } from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';
import { AddAnalyticalFromEmployerUseCase } from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationService } from '@/common/services/notification.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { BOQUpdatedEvent } from '@/modules/domain-events/events';

export class UpsertEmployerBoqItemUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly syncAnalyticalFromEmployer: SyncAnalyticalFromEmployerUseCase,
    private readonly addAnalyticalFromEmployer: AddAnalyticalFromEmployerUseCase,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: UpsertEmployerBoqItemInput, user?: OwnershipActor, userId?: string): Promise<Result<EmployerBoqItemResult>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    if (input.itemCode) {
      return this.upsertByItemCode(buildingId, input, user, userId);
    }

    const existing = await this.employerBoq.findByBuildingIdDescriptionAndUnit(
      buildingId,
      input.description,
      input.unit,
    );
    if (existing) {
      return this.updateExisting(existing, input, user, userId);
    }

    const itemCode = await this.employerBoq.generateNextItemCode(buildingId);
    const created = EmployerBoqItem.create({
      buildingId,
      itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (created.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          created.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    const item = created.getValue();
    await this.employerBoq.save(item);
    await this.addAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: item.itemCode,
    }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: item.id.toValue(), action: 'CREATE', before: null, after: { itemCode: item.itemCode, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice } });
    }
    await this.notifications.createForProjectMembers(building.projectId.toValue(), {
      title: 'تم تحديث مقايسة جهة الإسناد',
      titleEn: 'Employer BOQ Updated',
      message: `تم إضافة بند جديد ${item.itemCode} - ${item.description}`,
      messageEn: `New item added ${item.itemCode} - ${item.description}`,
      type: 'info',
      entityType: 'employer_boq',
      entityId: input.buildingId,
      link: `/projects/${building.projectId.toValue()}/buildings/${input.buildingId}/estimates/client`,
      createdBy: userId,
    });
    await this.publishBoqUpdated(input.buildingId, item.itemCode, 'created', userId);
    return Result.ok(toEmployerBoqItemResult(item));
  }

  private async publishBoqUpdated(buildingId: string, itemCode: string, action: 'created' | 'updated', userId?: string) {
    await this.eventBus.publish(
      new BOQUpdatedEvent(
        `${buildingId}:${itemCode}`,
        'boq',
        {
          id: buildingId,
          projectId: '',
          businessCode: itemCode,
          status: action,
          updatedBy: userId,
        },
      ),
    );
  }

  private async upsertByItemCode(
    buildingId: UniqueEntityId,
    input: UpsertEmployerBoqItemInput,
    user?: OwnershipActor,
    userId?: string,
  ): Promise<Result<EmployerBoqItemResult>> {
    const itemCode = input.itemCode as string;
    const existing = await this.employerBoq.findByBuildingIdAndItemCode(buildingId, itemCode);

    if (existing) {
      return this.updateExisting(existing, input, user, userId);
    }

    const created = EmployerBoqItem.create({
      buildingId,
      itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (created.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          created.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    const item = created.getValue();
    await this.employerBoq.save(item);
    await this.addAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: item.itemCode,
    }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: item.id.toValue(), action: 'CREATE', before: null, after: { itemCode: item.itemCode, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice } });
    }
    const building = await this.buildings.findById(buildingId);
    await this.notifications.createForProjectMembers(building?.projectId.toValue() ?? '', {
      title: 'تم تحديث مقايسة جهة الإسناد',
      titleEn: 'Employer BOQ Updated',
      message: `تم إضافة بند جديد ${item.itemCode} - ${item.description}`,
      messageEn: `New item added ${item.itemCode} - ${item.description}`,
      type: 'info',
      entityType: 'employer_boq',
      entityId: input.buildingId,
      link: `/projects/${building?.projectId.toValue() ?? ''}/buildings/${input.buildingId}/estimates/client`,
      createdBy: userId,
    });
    await this.publishBoqUpdated(input.buildingId, item.itemCode, 'created', userId);
    return Result.ok(toEmployerBoqItemResult(item));
  }

  private async updateExisting(
    existing: EmployerBoqItem,
    input: UpsertEmployerBoqItemInput,
    user?: OwnershipActor,
    userId?: string,
  ): Promise<Result<EmployerBoqItemResult>> {
    const before = { itemCode: existing.itemCode, description: existing.description, unit: existing.unit, quantity: existing.quantity, unitPrice: existing.unitPrice };
    const updateResult = existing.update({
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
    if (updateResult.isFailure) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.INVALID_ITEM,
          updateResult.error?.message ?? 'Invalid employer BOQ item',
        ),
      );
    }

    await this.employerBoq.save(existing);
    await this.syncAnalyticalFromEmployer.execute({
      buildingId: input.buildingId,
      itemCode: existing.itemCode,
    }, user);
    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: existing.id.toValue(), action: 'UPDATE', before, after: { itemCode: existing.itemCode, description: existing.description, unit: existing.unit, quantity: existing.quantity, unitPrice: existing.unitPrice } });
    }
    const building = await this.buildings.findById(existing.buildingId);
    await this.notifications.createForProjectMembers(building?.projectId.toValue() ?? '', {
      title: 'تم تحديث مقايسة جهة الإسناد',
      titleEn: 'Employer BOQ Updated',
      message: `تم تعديل البند ${existing.itemCode} - ${existing.description}`,
      messageEn: `Item updated ${existing.itemCode} - ${existing.description}`,
      type: 'info',
      entityType: 'employer_boq',
      entityId: existing.buildingId.toValue(),
      link: `/projects/${building?.projectId.toValue() ?? ''}/buildings/${existing.buildingId.toValue()}/estimates/client`,
      createdBy: userId,
    });
    await this.publishBoqUpdated(existing.buildingId.toValue(), existing.itemCode, 'updated', userId);
    return Result.ok(toEmployerBoqItemResult(existing));
  }
}
