import type { ExtractDeduction } from "@/types/finance";
import type { ExtractItem } from "@/types/boq";

export function sumWorkValue(items: ExtractItem[]): number {
  return items.reduce((s, i) => s + i.workValue, 0);
}

export function buildInsuranceDeduction(
  totalWork: number,
  percent: number,
  isArabic = true
): ExtractDeduction {
  return {
    id: "insurance-auto",
    name: isArabic ? "تأمين أعمال المقاول الباطن" : "Subcontractor insurance",
    amount: totalWork * (percent / 100),
    percent,
    type: "insurance",
    readOnly: false,
  };
}

export function buildPreviousPaidDeduction(
  amount: number,
  isArabic = true
): ExtractDeduction {
  return {
    id: "previous-paid-auto",
    name: isArabic ? "ماسبق صرفة" : "Previously paid",
    amount,
    type: "previous_paid",
    readOnly: true,
  };
}

export function sumDeductions(deductions: ExtractDeduction[]): number {
  return deductions.reduce((s, d) => s + (d.amount || 0), 0);
}

export function calcNetPayable(
  totalWork: number,
  deductions: ExtractDeduction[]
): number {
  return totalWork - sumDeductions(deductions);
}

export function mergeDeductions(
  manual: ExtractDeduction[],
  insurance: ExtractDeduction,
  previousPaid: ExtractDeduction
): ExtractDeduction[] {
  const manualOnly = manual.filter(
    (d) => d.type === "manual" && d.name.trim() !== ""
  );
  return [previousPaid, insurance, ...manualOnly];
}
