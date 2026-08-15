/**
 * Extract calculation rules mirrored from:
 * - frontend/lib/boqStore.ts (calcExtractItem, getPreviousForExtract, validateExtractItems)
 * - frontend/lib/extractCalculations.ts
 */

export type ExtractStatus = 'running' | 'final';
export type DeductionType = 'manual' | 'insurance' | 'previous_paid';

export interface ExtractItemInput {
  itemCode: string;
  description: string;
  unit: string;
  contractQuantity: number;
  previous: number;
  current: number;
  executionPercent: number;
  unitPrice: number;
  /** Identifies the exact contractor BOQ item/component when itemCode is shared by multiple rows. */
  contractorBoqItemId?: string;
}

export interface ExtractItemCalculated extends ExtractItemInput {
  total: number;
  executedQuantity: number;
  workValue: number;
}

export interface ExtractDeduction {
  id: string;
  name: string;
  amount: number;
  percent?: number;
  type: DeductionType;
  readOnly?: boolean;
}

/** Mirrors calcExtractItem — Previous + Current = Total */
export function calcExtractItem(item: ExtractItemInput): ExtractItemCalculated {
  const total = item.previous + item.current;
  const executedQuantity = total * (item.executionPercent / 100);
  const workValue = executedQuantity * item.unitPrice;
  return { ...item, total, executedQuantity, workValue };
}

/** Mirrors sumWorkValue */
export function sumWorkValue(items: ExtractItemCalculated[]): number {
  return items.reduce((s, i) => s + i.workValue, 0);
}

/** Mirrors buildInsuranceDeduction */
export function buildInsuranceDeduction(
  totalWork: number,
  percent: number,
): ExtractDeduction {
  return {
    id: 'insurance-auto',
    name: 'تأمين أعمال المقاول الباطن',
    amount: totalWork * (percent / 100),
    percent,
    type: 'insurance',
    readOnly: false,
  };
}

/** Mirrors buildPreviousPaidDeduction */
export function buildPreviousPaidDeduction(amount: number): ExtractDeduction {
  return {
    id: 'previous-paid-auto',
    name: 'ما سبق صرفه',
    amount,
    type: 'previous_paid',
    readOnly: true,
  };
}

/** Mirrors sumDeductions */
export function sumDeductions(deductions: ExtractDeduction[]): number {
  return deductions.reduce((s, d) => s + (d.amount || 0), 0);
}

/** Mirrors calcNetPayable — work + أخرى − deductions */
export function calcNetPayable(
  totalWork: number,
  otherAmounts: number,
  deductions: ExtractDeduction[],
): number {
  return totalWork + otherAmounts - sumDeductions(deductions);
}

/** Sum of named "أخرى" items; falls back to the plain total when no items are provided. */
export function sumOtherAmountItems(
  otherAmountItems?: { id: string; name: string; amount: number }[],
  otherAmounts: number = 0,
): number {
  if (otherAmountItems && otherAmountItems.length > 0) {
    return otherAmountItems.reduce((s, i) => s + (i.amount || 0), 0);
  }
  return otherAmounts;
}

/** Mirrors mergeDeductions — insurance (percentage), ما سبق صرفه, and fixed manual amounts are deductions. */
export function mergeDeductions(
  manual: ExtractDeduction[],
  insurance: ExtractDeduction,
  previousPaid: number = 0,
): ExtractDeduction[] {
  const manualOnly = manual.filter((d) => d.type === 'manual' && d.name.trim() !== '');
  const previous = previousPaid > 0 ? [buildPreviousPaidDeduction(previousPaid)] : [];
  return [insurance, ...previous, ...manualOnly];
}

export function computeExtractTotals(
  items: ExtractItemCalculated[],
  insurancePercent: number,
  manualDeductions: ExtractDeduction[],
  otherAmounts: number = 0,
  previousPaid: number = 0,
): {
  totalWorkValue: number;
  otherAmounts: number;
  deductions: ExtractDeduction[];
  totalDeductions: number;
  netPayable: number;
} {
  const totalWorkValue = sumWorkValue(items);
  const insurance = buildInsuranceDeduction(totalWorkValue, insurancePercent);
  const deductions = mergeDeductions(manualDeductions, insurance, previousPaid);
  const totalDeductions = sumDeductions(deductions);
  const netPayable = calcNetPayable(totalWorkValue, otherAmounts, deductions);
  return { totalWorkValue, otherAmounts, deductions, totalDeductions, netPayable };
}

/**
 * Mirrors getPreviousForExtract:
 * if status === final OR runningNumber === 1 → {}
 * else previous running extract totals by itemCode
 */
export function getPreviousQuantitiesFromExtracts(
  extracts: { status: ExtractStatus; runningNumber?: number; items: { itemCode: string; total: number }[] }[],
  status: ExtractStatus,
  runningNumber?: number,
): Record<string, number> {
  if (status === 'final' || runningNumber === 1) return {};

  const prev = extracts
    .filter((e) => e.status === 'running' && e.runningNumber === (runningNumber || 1) - 1)
    .sort((a, b) => (a.runningNumber || 0) - (b.runningNumber || 0))[0];

  if (!prev) return {};
  const map: Record<string, number> = {};
  prev.items.forEach((i) => {
    map[i.itemCode] = i.total;
  });
  return map;
}

/** Mirrors validateExtractItems — validates all extract business rules */
export function validateExtractItems(
  items: ExtractItemCalculated[],
  contractorAssigned: { itemCode: string; assignedQuantity: number }[],
): { ok: true } | { ok: false; error: string } {
  if (!items.length || items.every((i) => i.current === 0)) {
    return { ok: false, error: 'At least one item with executed quantity is required' };
  }
  for (const item of items) {
    if (item.current < 0) {
      return { ok: false, error: `Negative executed quantity for ${item.itemCode}` };
    }
    const contract = contractorAssigned.find((b) => b.itemCode === item.itemCode);
    if (!contract) continue;
    if (item.total > contract.assignedQuantity) {
      return {
        ok: false,
        error: `الكمية المنفذة للبند ${item.itemCode} تتجاوز الكمية المسندة (${contract.assignedQuantity})`,
      };
    }
  }
  return { ok: true };
}

/** Mirrors nextRunningNumber */
export function nextRunningNumber(
  extracts: { status: ExtractStatus; runningNumber?: number }[],
): number {
  const running = extracts.filter((e) => e.status === 'running');
  return running.length
    ? Math.max(...running.map((e) => e.runningNumber || 0)) + 1
    : 1;
}
