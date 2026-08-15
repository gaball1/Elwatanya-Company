"use client";

import { Card } from "@/components/ui";

interface Props {
  isArabic: boolean;
  totalWorkValue: number;
  otherAmounts?: number;
  totalDeductions: number;
  netPayable: number;
}

export default function ExtractSummaryCards({
  isArabic,
  totalWorkValue,
  otherAmounts = 0,
  totalDeductions,
  netPayable,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          <tr className="bg-surface-tertiary">
            <td className="p-4 font-bold text-text-primary">
              {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
            </td>
            <td className="p-4 text-left font-bold text-primary text-xl">
              {totalWorkValue.toLocaleString()} ج.م
            </td>
          </tr>
          {otherAmounts > 0 && (
            <tr className="bg-emerald-50 border-t">
              <td className="p-4 font-bold text-emerald-700">
                {isArabic ? "+ أخرى" : "+ Other"}
              </td>
              <td className="p-4 text-left font-bold text-emerald-700 text-xl">
                +{otherAmounts.toLocaleString()} ج.م
              </td>
            </tr>
          )}
          <tr className="bg-surface border-t">
            <td className="p-4 font-bold text-text-primary">
              {isArabic ? "خصم الاستقطاعات" : "Total Deductions"}
            </td>
            <td className="p-4 text-left font-bold text-danger text-xl">
              {totalDeductions.toLocaleString()} ج.م
            </td>
          </tr>
          <tr className="bg-teal-50 border-t-2 border-teal-400">
            <td className="p-4 font-bold text-teal-900">
              {isArabic ? "المستحق صرفة" : "Net Payable"}
            </td>
            <td className="p-4 text-left font-bold text-teal-700 text-2xl">
              {netPayable.toLocaleString()} ج.م
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ExtractSummaryCardsCompact({
  isArabic,
  totalWorkValue,
  otherAmounts = 0,
  totalDeductions,
  netPayable,
}: Props) {
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card className="p-5 bg-surface-secondary border-r-4 border-gold">
        <p className="text-text-secondary text-sm mb-1">
          {isArabic ? "قيمة الأعمال" : "Work Value"}
        </p>
        <p className="text-2xl font-bold text-primary">
          {totalWorkValue.toLocaleString()}
        </p>
      </Card>
      <Card className="p-5 bg-emerald-50 border-r-4 border-emerald-500">
        <p className="text-text-secondary text-sm mb-1">
          {isArabic ? "أخرى" : "Other"}
        </p>
        <p className="text-2xl font-bold text-emerald-700">
          +{otherAmounts.toLocaleString()}
        </p>
      </Card>
      <Card className="p-5 bg-danger-light border-r-4 border-red-500">
        <p className="text-text-secondary text-sm mb-1">
          {isArabic ? "الاستقطاعات" : "Deductions"}
        </p>
        <p className="text-2xl font-bold text-danger">
          {totalDeductions.toLocaleString()}
        </p>
      </Card>
      <Card className="p-5 bg-teal-50 border-r-4 border-teal-500">
        <p className="text-text-secondary text-sm mb-1">
          {isArabic ? "المستحق صرفة" : "Net Payable"}
        </p>
        <p className="text-3xl font-bold text-teal-700">
          {netPayable.toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
