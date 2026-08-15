// lib/statementItems.ts
// Shared helpers for client statements (مستخلصات جهة الإسناد).

import type { EmployerBoqItem } from '@/types/boq';

export interface StatementItemRow {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  previous: number;
  current: number;
  totalDone: number;
  final: number;
  workValue: number;
  deduction: number;
  net: number;
  notes: string;
}

/**
 * Build client-statement rows from the employer BOQ (مقايسة جهة الإسناد).
 * The BOQ supplies description/unit/quantity/unitPrice; previous & current
 * quantities are filled in by the accountant.
 */
export function employerBoqToStatementItems(
  boqItems: EmployerBoqItem[],
): StatementItemRow[] {
  return boqItems.map((b, idx) => {
    const quantity = Number(b.quantity ?? 0);
    const unitPrice = Number(b.unitPrice ?? 0);
    return {
      id: `boq-${Date.now()}-${idx}`,
      itemName: b.description || b.itemCode,
      unit: b.unit || 'م³',
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      previous: 0,
      current: 0,
      totalDone: 0,
      final: 0,
      workValue: 0,
      deduction: 0,
      net: 0,
      notes: '',
    };
  });
}
