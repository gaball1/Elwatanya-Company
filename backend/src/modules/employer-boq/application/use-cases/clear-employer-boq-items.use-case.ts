import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { BuildingApplicationError, BuildingErrorCode } from '@/modules/building/application/errors/building-application.error';
import { IEmployerBoqRepository } from '../../domain/employer-boq.repository';
import { RemoveAnalyticalBoqItemUseCase } from '@/modules/analytical-boq/application/use-cases/remove-analytical-boq-item.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationService } from '@/common/services/notification.service';

/**
 * Deletes every employer BOQ item of a building and cascades the removal
 * to the analytical/final BOQs (mirrors the single-item delete behavior).
 */
export class ClearEmployerBoqItemsUseCase {
  constructor(
    private readonly employerBoq: IEmployerBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly removeAnalytical: RemoveAnalyticalBoqItemUseCase,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async execute(buildingId: string, user?: OwnershipActor, userId?: string): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
    const buildingEntityId = new UniqueEntityId(buildingId);
    const building = await this.buildings.findById(buildingEntityId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const existingItems = await this.employerBoq.findByBuildingId(buildingEntityId);
    if (existingItems.length === 0) {
      return Result.ok();
    }

    const before = existingItems.map((i) => ({
      itemCode: i.itemCode,
      description: i.description,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    await this.employerBoq.deleteAllForBuilding(buildingEntityId);

    for (const item of existingItems) {
      const cascade = await this.removeAnalytical.execute(buildingId, item.itemCode, user, userId);
      if (cascade.isFailure) {
        const error = cascade.error as Error | undefined;
        if (error && 'code' in error && (error as { code: string }).code === 'ITEM_NOT_FOUND') {
          // Analytical item may not exist yet — the employer item is already removed.
          continue;
        }
      }
    }

    if (userId) {
      this.audit.log({ userId, entity: 'employer_boq', entityId: buildingId, action: 'DELETE_ALL', before, after: null });
    }
    await this.notifications.createForProjectMembers(building.projectId.toValue(), {
      title: 'تم تحديث مقايسة جهة الإسناد',
      titleEn: 'Employer BOQ Updated',
      message: `تم حذف جميع البنود (${existingItems.length}) من مقايسة جهة الإسناد`,
      messageEn: `All items (${existingItems.length}) removed from employer BOQ`,
      type: 'info',
      entityType: 'employer_boq',
      entityId: buildingId,
      link: `/projects/${building.projectId.toValue()}/buildings/${buildingId}/estimates/client`,
      createdBy: userId,
    });
    return Result.ok();
  }
}
