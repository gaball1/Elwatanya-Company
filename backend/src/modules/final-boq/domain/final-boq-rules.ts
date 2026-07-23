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
  };
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
      };
    }

    return {
      ...a,
      remainingQuantity: a.quantity - allocated,
      isAnalyzed: false,
      status: 'pending' as const,
      components: [],
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
