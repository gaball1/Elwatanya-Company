// src/modules/final-boq/domain/component.entity.ts
import { BaseEntity } from '../../../common/base.entity';
import { ValidationException } from '../../../common/exceptions/domain.exception';

/**
 * Component entity owned by a FinalBoqItem.
 * Represents a real business object that may later link to material, cost codes, etc.
 */
export class Component extends BaseEntity {
  id: string = this.id;
  finalBoqItemId: string;
  code: string; // unique within its FinalBoqItem
  description: string;
  unitPrice: number;
  quantity: number;
  lifecycleStatus: string;

  constructor(init: {
    finalBoqItemId: string;
    code: string;
    description: string;
    unitPrice: number;
    quantity: number;
    lifecycleStatus: string;
  }) {
    super();
    this.finalBoqItemId = init.finalBoqItemId;
    this.code = init.code;
    this.description = init.description;
    this.unitPrice = init.unitPrice;
    this.quantity = init.quantity;
    this.lifecycleStatus = init.lifecycleStatus;
    this.validate();
  }

  private validate() {
    if (!this.code) {
      throw new ValidationException('Component code must be provided');
    }
    if (this.unitPrice < 0) {
      throw new ValidationException('Component unitPrice cannot be negative');
    }
    if (this.quantity < 0) {
      throw new ValidationException('Component quantity cannot be negative');
    }
  }
}
