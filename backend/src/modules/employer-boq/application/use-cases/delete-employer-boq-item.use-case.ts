import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import {
  EmployerBoqApplicationError,
  EmployerBoqErrorCode,
} from '../errors/employer-boq-application.error';
import { RemoveAnalyticalBoqItemUseCase } from '@/modules/analytical-boq/application/use-cases/remove-analytical-boq-item.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationService } from '@/common/services/notification.service';

export class DeleteEmployerBoqItemUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly removeAnalytical: RemoveAnalyticalBoqItemUseCase,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
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

    const normalizedCode = itemCode.trim();
    const existing = await this.employerBoq.findByBuildingIdAndItemCode(buildingEntityId, normalizedCode);
    if (!existing) {
      return Result.fail(
        new EmployerBoqApplicationError(
          EmployerBoqErrorCode.ITEM_NOT_FOUND,
          'Employer BOQ item not found',
        ),
      );
    }

    const before = { itemCode: existing.itemCode, description: existing.description, unit: existing.unit, quantity: existing.quantity, unitPrice: existing.unitPrice };
    await this.employerBoq.deleteByItemCode(buildingEntityId, normalizedCode);

    // Cascade delete from Analytical (which also syncs Final BOQ). Tolerate absence in analytical.
    const cascade = await this.removeAnalytical.execute(buildingId, normalizedCode, user, userId);
    if (cascade.isFailure) {
      // Analytical item may not exist yet — the employer item is already removed.
      const error = cascade.error as Error | undefined;
      if (error && 'code' in error && (error as { code: string }).code === 'ITEM_NOT_FOUND') {
        // ignore
      }
    }

    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: existing.id.toValue(), action: 'DELETE', before, after: null });
    }
    await this.notifications.createForProjectMembers(building.projectId.toValue(), {
      title: 'تم تحديث مقايسة جهة الإسناد',
      titleEn: 'Employer BOQ Updated',
      message: `تم حذف البند ${existing.itemCode} - ${existing.description}`,
      messageEn: `Item deleted ${existing.itemCode} - ${existing.description}`,
      type: 'info',
      entityType: 'employer_boq',
      entityId: buildingId,
      link: `/projects/${building.projectId.toValue()}/buildings/${buildingId}/estimates/client`,
      createdBy: userId,
    });
    return Result.ok();
  }
}
