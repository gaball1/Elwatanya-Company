// src/final-boq/domain/final-boq-item.entity.ts
import { BaseEntity } from '../../common/base.entity';

export class FinalBoqItem extends BaseEntity {
  id: string;
  finalBoqId: string;
  description: string;
  unitPrice: number; // Decimal stored as number in TS
  quantity: number;
}
