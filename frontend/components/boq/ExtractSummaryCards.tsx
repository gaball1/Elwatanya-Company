"use client";

import { Card } from "@/components/ui";

interface Props {
  isArabic: boolean;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
}

export default function ExtractSummaryCards({
  isArabic,
  totalWorkValue,
  totalDeductions,
  netPayable,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          <tr className="bg-gray-100">
            <td className="p-4 font-bold text-gray-700">
              {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
            </td>
            <td className="p-4 text-left font-bold text-primary text-xl">
              {totalWorkValue.toLocaleString()} ج.م
            </td>
          </tr>
          <tr className="bg-white border-t">
            <td className="p-4 font-bold text-gray-700">
              {isArabic ? "خصم الاستقطاعات" : "Total Deductions"}
            </td>
            <td className="p-4 text-left font-bold text-red-600 text-xl">
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
  totalDeductions,
  netPayable,
}: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="p-5 bg-gray-50 border-r-4 border-primary">
        <p className="text-gray-500 text-sm mb-1">
          {isArabic ? "قيمة الأعمال" : "Work Value"}
        </p>
        <p className="text-2xl font-bold text-primary">
          {totalWorkValue.toLocaleString()}
        </p>
      </Card>
      <Card className="p-5 bg-red-50 border-r-4 border-red-500">
        <p className="text-gray-500 text-sm mb-1">
          {isArabic ? "الاستقطاعات" : "Deductions"}
        </p>
        <p className="text-2xl font-bold text-red-600">
          {totalDeductions.toLocaleString()}
        </p>
      </Card>
      <Card className="p-5 bg-teal-50 border-r-4 border-teal-500">
        <p className="text-gray-500 text-sm mb-1">
          {isArabic ? "المستحق صرفة" : "Net Payable"}
        </p>
        <p className="text-3xl font-bold text-teal-700">
          {netPayable.toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
