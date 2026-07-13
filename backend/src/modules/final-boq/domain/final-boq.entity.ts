// src/modules/final-boq/domain/final-boq.entity.ts
import { BaseEntity } from '../../../common/base.entity';
import { FinalBoqStatus } from './final-boq-status.enum';
import { FinalBoqItem } from './final-boq-item.entity';

/**
 * Aggregate Root for a Final BOQ.
 * Contains business behaviour that ensures invariants are kept.
 */
export class FinalBoq extends BaseEntity {
  id: string = this.id;
  buildingId: string;
  projectId: string;
  businessCode: string;
  status: FinalBoqStatus = FinalBoqStatus.PENDING;
  items: FinalBoqItem[] = [];

  constructor(init: { buildingId: string; projectId: string; businessCode: string }) {
    super();
    this.buildingId = init.buildingId;
    this.projectId = init.projectId;
    this.businessCode = init.businessCode;
  }

  /**
   * Adds a new item to the BOQ.
   */
  addItem(item: FinalBoqItem) {
    this.items.push(item);
  }

  /**
   * Removes an item by its id.
   */
  removeItem(itemId: string) {
    this.items = this.items.filter((i) => i.id !== itemId);
  }

  /**
   * Change the aggregate status, validating allowed transitions.
   */
  changeStatus(newStatus: FinalBoqStatus) {
    this.validateStatusTransition(newStatus);
    this.status = newStatus;
  }

  private validateStatusTransition(target: FinalBoqStatus) {
    const allowed: Record<FinalBoqStatus, FinalBoqStatus[]> = {
      [FinalBoqStatus.PENDING]: [FinalBoqStatus.ANALYZED],
      [FinalBoqStatus.ANALYZED]: [FinalBoqStatus.DISTRIBUTED],
      [FinalBoqStatus.DISTRIBUTED]: [FinalBoqStatus.COMPLETED],
      [FinalBoqStatus.COMPLETED]: [],
    };
    if (!allowed[this.status].includes(target)) {
      throw new Error(`Invalid status transition from ${this.status} to ${target}`);
    }
  }
}
