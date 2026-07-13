// src/modules/final-boq/domain/final-boq-item.entity.ts
import { BaseEntity } from '../../../common/base.entity';
import { Component } from './component.entity';
import { ValidationException } from '../../../common/exceptions/domain.exception';
import { Decimal } from 'decimal.js';

/**
 * Entity representing a line item inside a Final BOQ.
 * Holds business behaviour such as component management and price validation.
 */
export class FinalBoqItem extends BaseEntity {
  // Primary UUID identifier (inherited from BaseEntity)
  // Business code used in UI and external integrations
  businessCode: string;
  // Optional self‑reference for hierarchical items
  parentItemId?: string;
  // Explicit ordering of items within a BOQ
  sortOrder: number;

  finalBoqId: string;
  description: string;
  unitPrice: Decimal; // fixed‑point precision
  quantity: Decimal;
  components: Component[] = [];

  constructor(init: { finalBoqId: string; description: string; unitPrice: number; quantity: number }) {
    super();
    this.finalBoqId = init.finalBoqId;
    this.description = init.description;
    this.unitPrice = new Decimal(init.unitPrice);
    this.quantity = new Decimal(init.quantity);
  }

  /** Add a component to this item */
  addComponent(component: Component) {
    // Ensure code uniqueness within this item
    if (this.components.some((c) => c.code === component.code)) {
      throw new ValidationException(`Component code '${component.code}' already exists for this BOQ item`);
    }
    this.components.push(component);
    this.validateComponentPrices();
  }

  /** Remove a component by id */
  removeComponent(componentId: string) {
    this.components = this.components.filter((c) => c.id !== componentId);
    this.validateComponentPrices();
  }

  /** Validate that sum of component unit prices does not exceed this item's unit price */
  validateComponentPrices() {
    const sum = this.components.reduce((acc, c) => acc + c.unitPrice, 0);
    if (new Decimal(sum).greaterThan(this.unitPrice)) {
      throw new ValidationException(
        `Total component unit prices (${sum}) exceed FinalBoqItem unit price (${this.unitPrice.toString()})`,
      );
    }
  }
}
