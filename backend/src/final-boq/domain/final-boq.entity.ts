// src/final-boq/domain/final-boq.entity.ts
import { BaseEntity } from '../../common/base.entity';

export enum FinalBoqStatus {
  PENDING = 'PENDING',
  ANALYZED = 'ANALYZED',
  DISTRIBUTED = 'DISTRIBUTED',
  CLOSED = 'CLOSED',
}

export class FinalBoq extends BaseEntity {
  id: string;
  buildingId: string;
  status: FinalBoqStatus;
  // relations are not persisted here – Prisma handles them
}
