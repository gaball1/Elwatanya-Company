/**
 * Pure BOQ calculation helpers mirrored from frontend/lib/boqStore.ts
 * Do not change formulas without updating the frontend store.
 */

/** Frontend: function calcTotal(q, p) { return q * p; } */
export function calcTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export type FinalItemStatus =
  | 'pending'
  | 'analyzed'
  | 'partial'
  | 'distributed'
  | 'completed';

export interface AllocationRef {
  contractorId: string;
  contractorName: string;
  itemCode: string;
  componentId?: string | null;
  assignedQuantity: number;
}

export interface ComponentStateInput {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface ComponentStateOutput extends ComponentStateInput {
  remainingQuantity: number;
  isDistributed: boolean;
  distribution: {
    contractorId: string;
    contractorName: string;
    quantity: number;
    percentage: number;
    assignedAt: string;
  }[];
}

export interface FinalItemStateInput {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  isAnalyzed: boolean;
  components: ComponentStateInput[];
  status: FinalItemStatus;
}

export interface FinalItemStateOutput extends FinalItemStateInput {
  remainingQuantity: number;
  components: ComponentStateOutput[];
  /** Distribution for non-analyzed items (componentId === null). Empty for analyzed items. */
  itemDistribution: ComponentStateOutput['distribution'];
}

/**
 * Mirrors getAllocatedQty(buildingId, itemCode)
 * Sum of assignedQuantity for the same itemCode across contractors.
 * Note: frontend sums any matching itemCode (does not filter by componentId).
 */
export function getAllocatedQty(
  allocations: AllocationRef[],
  itemCode: string,
): number {
  let sum = 0;
  for (const a of allocations) {
    if (a.itemCode === itemCode) {
      sum += a.assignedQuantity;
    }
  }
  return sum;
}

/**
 * Mirrors getComponentAllocatedQty(buildingId, itemCode, componentId)
 */
export function getComponentAllocatedQty(
  allocations: AllocationRef[],
  itemCode: string,
  componentId: string,
): number {
  let sum = 0;
  for (const a of allocations) {
    if (a.itemCode === itemCode && a.componentId === componentId) {
      sum += a.assignedQuantity;
    }
  }
  return sum;
}

/**
 * Sum of component values (quantity × unitPrice).
 * Used to guard analyzed item budgets against the parent item price.
 */
export function sumComponentValues(
  components: { quantity: number; unitPrice: number }[],
): number {
  let sum = 0;
  for (const c of components) {
    sum += c.quantity * c.unitPrice;
  }
  return sum;
}

/**
 * Budget rule: analyzed component totals must NOT exceed the parent item's
 * original total price (item.quantity × item.unitPrice). Mirrors the budget
 * validation exposed in the final BOQ UI.
 */
export function validateComponentsWithinBudget(
  itemTotalValue: number,
  components: { quantity: number; unitPrice: number }[],
): { ok: true } | { ok: false; error: string } {
  const total = sumComponentValues(components);
  if (total > itemTotalValue) {
    return {
      ok: false,
      error: `إجمالي التحليل (${total}) يتجاوز القيمة الإجمالية للبند (${itemTotalValue})`,
    };
  }
  return { ok: true };
}

/** Build item-level distribution entries from allocations with no componentId. */
function buildItemDistribution(
  allocations: AllocationRef[],
  itemCode: string,
  quantity: number,
  assignedAt: string,
): ComponentStateOutput['distribution'] {
  const distribution: ComponentStateOutput['distribution'] = [];
  for (const a of allocations) {
    if (
      a.itemCode === itemCode &&
      (a.componentId === null || a.componentId === undefined)
    ) {
      distribution.push({
        contractorId: a.contractorId,
        contractorName: a.contractorName || a.contractorId,
        quantity: a.assignedQuantity,
        percentage: (a.assignedQuantity / quantity) * 100,
        assignedAt,
      });
    }
  }
  return distribution;
}

/**
 * Mirrors syncFinalItemState / recalcFinalRemaining
 */
export function syncFinalItemState(
  item: FinalItemStateInput,
  allocations: AllocationRef[],
  assignedAt: string = new Date().toISOString(),
): FinalItemStateOutput {
  const allocated = getAllocatedQty(allocations, item.itemCode);

  if (item.isAnalyzed && item.components.length > 0) {
    const components: ComponentStateOutput[] = item.components.map((comp) => {
      let compAllocated = 0;
      const distribution: ComponentStateOutput['distribution'] = [];

      for (const a of allocations) {
        if (a.itemCode === item.itemCode && a.componentId === comp.id) {
          compAllocated += a.assignedQuantity;
          distribution.push({
            contractorId: a.contractorId,
            contractorName: a.contractorName || a.contractorId,
            quantity: a.assignedQuantity,
            percentage: (a.assignedQuantity / comp.quantity) * 100,
            assignedAt,
          });
        }
      }

      return {
        ...comp,
        remainingQuantity: Math.max(0, comp.quantity - compAllocated),
        isDistributed: compAllocated >= comp.quantity,
        distribution,
      };
    });

    const allDistributed = components.every((c) => c.isDistributed);
    const anyDistributed = components.some((c) => c.isDistributed);
    const status: FinalItemStatus = allDistributed
      ? 'distributed'
      : anyDistributed
        ? 'partial'
        : 'analyzed';

    return {
      ...item,
      components,
      status,
      remainingQuantity: Math.max(0, item.quantity - allocated),
      itemDistribution: [],
    };
  }

  let status: FinalItemStatus;
  if (allocated >= item.quantity) {
    status = 'distributed';
  } else if (allocated > 0) {
    status = 'partial';
  } else {
    status = 'pending';
  }

  return {
    ...item,
    components: item.components.map((comp) => ({
      ...comp,
      remainingQuantity: Math.max(0, comp.quantity),
      isDistributed: false,
      distribution: [],
    })),
    status,
    remainingQuantity: Math.max(0, item.quantity - allocated),
    itemDistribution: buildItemDistribution(
      allocations,
      item.itemCode,
      item.quantity,
      assignedAt,
    ),
  };
}

/**
 * Business rule (user-approved):
 * Once a final item has been analyzed (has components) or distributed
 * (has allocations), its quantity can no longer be decreased — neither in
 * the analytical BOQ nor the final BOQ. Increases are always allowed and
 * become available for distribution.
 */
export interface FinalItemCommitState {
  isAnalyzed: boolean;
  status?: string;
  itemStatus?: string;
  components?: unknown[];
  componentCount?: number;
}

export function isFinalItemCommitted(item: FinalItemCommitState | null | undefined): boolean {
  if (!item) return false;
  const componentCount = item.componentCount ?? item.components?.length ?? 0;
  const analyzed = item.isAnalyzed && componentCount > 0;
  const status = item.itemStatus ?? item.status ?? 'pending';
  const distributed = status !== 'pending';
  return analyzed || distributed;
}

/**
 * Returns the analytical source items that attempt to DECREASE the quantity
 * of a final BOQ item that has already been analyzed or distributed.
 * Used to block the analytical→final sync before it corrupts allocations.
 */
export function findCommittedDecreaseViolations(
  analyticalItems: AnalyticalSourceItem[],
  current: FinalItemStateInput[],
): AnalyticalSourceItem[] {
  return analyticalItems.filter((a) => {
    const existing = current.find((f) => f.itemCode === a.itemCode);
    if (!existing) return false;
    return isFinalItemCommitted(existing) && a.quantity < existing.quantity;
  });
}

export interface AnalyticalSourceItem {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

/**
 * Mirrors syncFinalFromAnalytical
 */
export function syncFinalFromAnalytical(
  analyticalItems: AnalyticalSourceItem[],
  current: FinalItemStateInput[],
  allocations: AllocationRef[],
  assignedAt: string = new Date().toISOString(),
): FinalItemStateOutput[] {
  return analyticalItems.map((a) => {
    const existing = current.find((f) => f.itemCode === a.itemCode);
    const allocated = getAllocatedQty(allocations, a.itemCode);

    if (existing) {
      const updatedComponents: ComponentStateOutput[] = existing.components.map((comp) => {
        const ratio = a.quantity / existing.quantity;
        const newCompQty = Math.round(comp.quantity * ratio * 100) / 100;
        const compAllocated = getComponentAllocatedQty(allocations, a.itemCode, comp.id);

        const distribution: ComponentStateOutput['distribution'] = [];
        for (const alloc of allocations) {
          if (alloc.itemCode === a.itemCode && alloc.componentId === comp.id) {
            distribution.push({
              contractorId: alloc.contractorId,
              contractorName: alloc.contractorName || alloc.contractorId,
              quantity: alloc.assignedQuantity,
              percentage: (alloc.assignedQuantity / newCompQty) * 100,
              assignedAt,
            });
          }
        }

        return {
          ...comp,
          quantity: newCompQty,
          totalValue: newCompQty * comp.unitPrice,
          remainingQuantity: Math.max(0, newCompQty - compAllocated),
          distribution,
          isDistributed: compAllocated >= newCompQty,
        };
      });

      const hasComponents = updatedComponents.length > 0;
      let newStatus: FinalItemStatus;
      if (hasComponents) {
        const allDistributed = updatedComponents.every((c) => c.isDistributed);
        const anyDistributed = updatedComponents.some((c) => c.isDistributed);
        if (allDistributed) {
          newStatus = 'distributed';
        } else if (anyDistributed) {
          newStatus = 'partial';
        } else {
          newStatus = 'analyzed';
        }
      } else if (allocated >= a.quantity) {
        newStatus = 'distributed';
      } else if (allocated > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }

      return {
        ...a,
        remainingQuantity: Math.max(0, a.quantity - allocated),
        isAnalyzed: hasComponents,
        status: newStatus,
        components: updatedComponents,
        itemDistribution: hasComponents
          ? []
          : buildItemDistribution(allocations, a.itemCode, a.quantity, assignedAt),
      };
    }

    return {
      ...a,
      remainingQuantity: a.quantity - allocated,
      isAnalyzed: false,
      status: 'pending' as const,
      components: [],
      itemDistribution: buildItemDistribution(
        allocations,
        a.itemCode,
        a.quantity,
        assignedAt,
      ),
    };
  });
}

/**
 * Mirrors updateFinalItemQuantity scaling rules.
 * Returns null when newQuantity < allocated (frontend blocks the edit).
 */
export function applyFinalItemQuantityUpdate(
  item: FinalItemStateInput,
  newQuantity: number,
  allocations: AllocationRef[],
  newUnitPrice?: number,
  assignedAt: string = new Date().toISOString(),
): FinalItemStateOutput | null {
  const allocated = getAllocatedQty(allocations, item.itemCode);
  if (newQuantity < allocated) {
    return null;
  }

  if (isFinalItemCommitted(item) && newQuantity < item.quantity) {
    return null;
  }

  const ratio = newQuantity / item.quantity;
  const unitPrice = newUnitPrice ?? item.unitPrice;

  const updated: FinalItemStateInput = {
    ...item,
    quantity: newQuantity,
    unitPrice,
    totalValue: newQuantity * unitPrice,
  };

  if (item.isAnalyzed && item.components.length > 0) {
    const components: ComponentStateOutput[] = item.components.map((comp) => {
      const newCompQty = Math.round(comp.quantity * ratio * 100) / 100;
      const compAllocated = getComponentAllocatedQty(allocations, item.itemCode, comp.id);

      const distribution: ComponentStateOutput['distribution'] = [];
      for (const alloc of allocations) {
        if (alloc.itemCode === item.itemCode && alloc.componentId === comp.id) {
          distribution.push({
            contractorId: alloc.contractorId,
            contractorName: alloc.contractorName || alloc.contractorId,
            quantity: alloc.assignedQuantity,
            percentage: (alloc.assignedQuantity / newCompQty) * 100,
            assignedAt,
          });
        }
      }

      return {
        ...comp,
        quantity: newCompQty,
        totalValue: newCompQty * comp.unitPrice,
        remainingQuantity: Math.max(0, newCompQty - compAllocated),
        isDistributed: compAllocated >= newCompQty,
        distribution,
      };
    });

    const allDistributed = components.every((c) => c.isDistributed);
    const anyDistributed = components.some((c) => c.isDistributed);
    const status: FinalItemStatus = allDistributed
      ? 'distributed'
      : anyDistributed
        ? 'partial'
        : 'analyzed';

    return {
      ...updated,
      components,
      status,
      remainingQuantity: Math.max(0, newQuantity - allocated),
      isAnalyzed: true,
      itemDistribution: [],
    };
  }

  let status: FinalItemStatus;
  if (allocated >= newQuantity) {
    status = 'distributed';
  } else if (allocated > 0) {
    status = 'partial';
  } else {
    status = 'pending';
  }

  return {
    ...updated,
    components: [],
    status,
    remainingQuantity: Math.max(0, newQuantity - allocated),
    itemDistribution: buildItemDistribution(
      allocations,
      item.itemCode,
      newQuantity,
      assignedAt,
    ),
  };
}

/**
 * Mirrors distributeComponent quantity validation.
 * totalDistributed must === component.quantity; each qty must be > 0.
 */
export function validateComponentDistribution(
  componentQuantity: number,
  distribution: { contractorId: string; quantity: number }[],
): { ok: true } | { ok: false; error: string } {
  const totalDistributed = distribution.reduce((sum, d) => sum + d.quantity, 0);
  if (totalDistributed !== componentQuantity) {
    return {
      ok: false,
      error: `مجموع الكميات الموزعة (${totalDistributed}) لا يساوي كمية المكون (${componentQuantity})`,
    };
  }

  for (const d of distribution) {
    if (d.quantity <= 0) {
      return {
        ok: false,
        error: `الكمية الموزعة على المقاول ${d.contractorId} يجب أن تكون أكبر من صفر`,
      };
    }
  }

  return { ok: true };
}

/**
 * Partial distribution validation.
 * Allows distributing a portion now and the rest later, as long as the total
 * (already allocated + new entries) does not exceed the component/item quantity.
 */
export function validatePartialComponentDistribution(
  componentQuantity: number,
  alreadyAllocated: number,
  distribution: { contractorId: string; quantity: number }[],
): { ok: true } | { ok: false; error: string } {
  if (distribution.length === 0) {
    return { ok: false, error: 'يجب توزيع كمية واحدة على الأقل' };
  }

  let total = 0;
  for (const d of distribution) {
    if (d.quantity <= 0) {
      return {
        ok: false,
        error: `الكمية الموزعة على المقاول ${d.contractorId} يجب أن تكون أكبر من صفر`,
      };
    }
    total += d.quantity;
  }

  const available = componentQuantity - alreadyAllocated;
  if (total > available) {
    return {
      ok: false,
      error: `مجموع الكميات الموزعة (${total}) يتجاوز الكمية المتاحة (${Math.max(0, available)})`,
    };
  }

  return { ok: true };
}

/**
 * Derive Final item status after component distribution (mirrors distributeComponent).
 */
export function statusAfterComponentDistribution(
  components: { isDistributed: boolean }[],
): FinalItemStatus {
  const allDistributed = components.every((c) => c.isDistributed);
  const anyDistributed = components.some((c) => c.isDistributed);

  if (allDistributed && components.length > 0) {
    return 'distributed';
  }
  if (anyDistributed) {
    return 'partial';
  }
  if (components.length > 0) {
    return 'analyzed';
  }
  return 'pending';
}
