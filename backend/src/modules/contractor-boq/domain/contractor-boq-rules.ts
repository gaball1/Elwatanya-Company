/**
 * Contractor BOQ rules mirrored from frontend/lib/boqStore.ts
 */

import { calcTotal } from '@/modules/final-boq/domain/final-boq-rules';

export { calcTotal };

export interface FinalItemForAllocation {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  isAnalyzed: boolean;
  components: {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    remainingQuantity: number;
  }[];
}

export interface ContractorItemState {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  assignedQuantity: number;
  unitPrice: number;
  totalValue: number;
  componentId?: string | null;
  finalItemId?: string | null;
}

/**
 * Mirrors allocateContractorItem validation + resulting item patch.
 */
export function allocateContractorItem(
  finalItem: FinalItemForAllocation,
  existingItems: ContractorItemState[],
  itemCodeOrComponent: string,
  qty: number,
):
  | { ok: true; nextItems: ContractorItemState[]; itemCode: string }
  | { ok: false; error: string } {
  const parts = itemCodeOrComponent.split('|');
  const itemCode = parts[0];
  const componentId = parts.length > 1 ? parts[1] : undefined;

  if (finalItem.itemCode !== itemCode) {
    return { ok: false, error: 'البند غير موجود في المقايسة النهائية' };
  }

  if (finalItem.isAnalyzed && finalItem.components.length > 0 && !componentId) {
    return {
      ok: false,
      error: 'هذا البند متحلل، لا يمكن توزيعه مباشرة. يرجى توزيع المكونات.',
    };
  }

  let availableQuantity = finalItem.quantity;
  let unitPrice = finalItem.unitPrice;
  let description = finalItem.description;
  let unit = finalItem.unit;
  let actualComponentId: string | undefined = componentId;

  if (componentId) {
    const component = finalItem.components.find((c) => c.id === componentId);
    if (!component) {
      return { ok: false, error: 'المكون غير موجود في البند' };
    }
    availableQuantity = component.remainingQuantity;
    unitPrice = component.unitPrice;
    description = `${component.name} (${finalItem.description})`;
    unit = component.unit;
    actualComponentId = componentId;
  }

  if (qty > availableQuantity) {
    return {
      ok: false,
      error: `الكمية المطلوبة (${qty}) أكبر من الكمية المتاحة (${availableQuantity})`,
    };
  }

  const existingItem = existingItems.find(
    (i) => i.itemCode === itemCode && i.componentId === actualComponentId,
  );

  const newItem: ContractorItemState = {
    itemCode,
    description,
    unit,
    quantity: qty,
    assignedQuantity: qty,
    unitPrice,
    totalValue: calcTotal(qty, unitPrice),
    componentId: actualComponentId ?? null,
    finalItemId: itemCode,
  };

  let nextItems: ContractorItemState[];
  if (existingItem) {
    const newQty = existingItem.assignedQuantity + qty;
    nextItems = existingItems.map((i) =>
      i.itemCode === itemCode && i.componentId === actualComponentId
        ? {
            ...i,
            assignedQuantity: newQty,
            quantity: newQty,
            totalValue: calcTotal(newQty, unitPrice),
          }
        : i,
    );
  } else {
    nextItems = [...existingItems, newItem];
  }

  return { ok: true, nextItems, itemCode };
}

/**
 * Mirrors updateContractorItemQuantity
 */
export function updateContractorItemQuantity(
  finalItem: FinalItemForAllocation,
  allBuildingAllocations: {
    contractorId: string;
    itemCode: string;
    componentId?: string | null;
    assignedQuantity: number;
  }[],
  contractorId: string,
  itemCode: string,
  componentId: string | undefined,
  newQty: number,
  existingItems: ContractorItemState[],
):
  | { ok: true; nextItems: ContractorItemState[] }
  | { ok: false; error: string } {
  let totalAllocatedToOthers = 0;
  for (const a of allBuildingAllocations) {
    if (a.contractorId === contractorId) continue;
    if (a.itemCode === itemCode && a.componentId === componentId) {
      totalAllocatedToOthers += a.assignedQuantity;
    }
  }

  let maxAllowed = finalItem.quantity;
  let unitPrice = finalItem.unitPrice;
  if (componentId) {
    const component = finalItem.components.find((c) => c.id === componentId);
    if (!component) return { ok: false, error: 'المكون غير موجود' };
    maxAllowed = component.quantity;
    unitPrice = component.unitPrice;
  }

  const availableForThis = maxAllowed - totalAllocatedToOthers;
  if (newQty > availableForThis) {
    return {
      ok: false,
      error: `الكمية المطلوبة (${newQty}) تتجاوز المتاح (${availableForThis})`,
    };
  }

  const nextItems = existingItems.map((i) => {
    if (i.itemCode === itemCode && i.componentId === componentId) {
      return {
        ...i,
        assignedQuantity: newQty,
        quantity: newQty,
        totalValue: calcTotal(newQty, unitPrice),
      };
    }
    return i;
  });

  return { ok: true, nextItems };
}

/**
 * Mirrors getAvailableQtyForContractorItem
 */
export function getAvailableQtyForContractorItem(
  finalItem: FinalItemForAllocation | null,
  allBuildingAllocations: {
    contractorId: string;
    itemCode: string;
    componentId?: string | null;
    assignedQuantity: number;
  }[],
  contractorId: string,
  itemCode: string,
  componentId: string | undefined,
): number {
  if (!finalItem) return 0;

  let maxAllowed = finalItem.quantity;
  if (componentId) {
    const comp = finalItem.components.find((c) => c.id === componentId);
    if (!comp) return 0;
    maxAllowed = comp.quantity;
  }

  let totalAllocatedToOthers = 0;
  for (const a of allBuildingAllocations) {
    if (a.contractorId === contractorId) continue;
    if (a.itemCode === itemCode && a.componentId === componentId) {
      totalAllocatedToOthers += a.assignedQuantity;
    }
  }

  return Math.max(0, maxAllowed - totalAllocatedToOthers);
}
