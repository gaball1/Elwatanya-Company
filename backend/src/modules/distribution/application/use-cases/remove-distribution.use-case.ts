import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import {
  getOrCreateFinalBoq,
  toFinalBoqItemResult,
} from '@/modules/final-boq/application/use-cases/final-boq-mappers';
import { FinalBoqItemResult } from '@/modules/final-boq/application/dto/final-boq.dto';
import {
  FinalBoqApplicationError,
  FinalBoqErrorCode,
} from '@/modules/final-boq/application/errors/final-boq-application.error';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';

export interface RemoveDistributionInput {
  buildingId: string;
  itemCode: string;
  componentId?: string;
  contractorId: string;
}

/**
 * Removes a contractor's allocation for a final item (or one of its components).
 * The freed quantity returns to the item/component remaining quantity and the
 * final BOQ status is re-derived from the live allocations.
 *
 * Blocks removal when StatementItem rows reference the allocation (extract integrity).
 */
export class RemoveDistributionUseCase {
  constructor(
    private readonly finalBoq: IFinalBoqRepository,
    private readonly contractorBoq: IContractorBoqRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: RemoveDistributionInput, user?: OwnershipActor, userId?: string): Promise<Result<FinalBoqItemResult>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);
    const buildingId = new UniqueEntityId(input.buildingId);
    const building = await this.buildings.findById(buildingId);
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const aggregate = await getOrCreateFinalBoq(building, this.finalBoq);
    const item = aggregate.findItemByCode(input.itemCode);
    if (!item) {
      return Result.fail(
        new FinalBoqApplicationError(FinalBoqErrorCode.ITEM_NOT_FOUND, 'البند غير موجود'),
      );
    }

    if (input.componentId) {
      const component = item.findComponent(new UniqueEntityId(input.componentId));
      if (!component) {
        return Result.fail(
          new FinalBoqApplicationError(FinalBoqErrorCode.COMPONENT_NOT_FOUND, 'المكون غير موجود'),
        );
      }
    }

    const boq = await this.contractorBoq.findByBuildingAndSubcontractor(
      buildingId,
      new UniqueEntityId(input.contractorId),
    );
    if (boq) {
      const allocationItem = boq.items.find(
        (i) =>
          i.itemCode === input.itemCode &&
          (i.componentId?.toValue() ?? undefined) === input.componentId,
      );

      if (allocationItem) {
        const statementItemCount = await this.prisma.statementItem.count({
          where: {
            contractorBoqItemId: allocationItem.id.toValue(),
            deletedAt: null,
          },
        });

        if (statementItemCount > 0) {
          return Result.fail(
            new FinalBoqApplicationError(
              FinalBoqErrorCode.DISTRIBUTION_IN_USE,
              `لا يمكن إزالة التوزيع — البند ${input.itemCode} مستخدم في ${statementItemCount} سطر/سطور استخراج. يرجى حذف الاستخراجات المرتبطة أولاً`,
            ),
          );
        }

        boq.removeItem(input.itemCode, input.componentId);
        await this.contractorBoq.save(boq);
      }
    }

    if (userId) {
      this.audit.log({
        userId,
        entity: 'distribution',
        entityId: input.componentId ?? input.itemCode,
        action: 'REMOVE_DISTRIBUTION',
        before: { itemCode: input.itemCode, componentId: input.componentId, contractorId: input.contractorId },
        after: null,
      });
    }

    const allocations = await this.contractorBoq.getAllocationsForBuilding(buildingId);
    return Result.ok(toFinalBoqItemResult(item, allocations));
  }
}
