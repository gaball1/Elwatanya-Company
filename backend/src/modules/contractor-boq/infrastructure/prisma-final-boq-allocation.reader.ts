import { Injectable } from '@nestjs/common';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IFinalBoqAllocationReader } from '@/modules/final-boq/domain/final-boq.repository';
import { AllocationRef } from '@/modules/final-boq/domain/final-boq-rules';
import { IContractorBoqRepository } from '../domain/contractor-boq.repository';

/** Real allocation reader for Final BOQ syncFinalItemState / syncFinalFromAnalytical */
@Injectable()
export class PrismaFinalBoqAllocationReader implements IFinalBoqAllocationReader {
  constructor(private readonly contractorBoq: IContractorBoqRepository) {}

  async getAllocationsForBuilding(buildingId: UniqueEntityId): Promise<AllocationRef[]> {
    return this.contractorBoq.getAllocationsForBuilding(buildingId);
  }
}
