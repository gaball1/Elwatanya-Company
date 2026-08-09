/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Edit2, Download, Printer } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import SignaturesSection from "@/components/boq/SignaturesSection";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import { ExtractSummaryCardsCompact } from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import { extractService } from "@/services/extract.service";
import { subcontractorService } from "@/services/subcontractor.service";
import type { ContractorExtract } from "@/types/boq";

export default function ExtractDetailPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const extractId = params.extractId as string;
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;
  const { showToast, ToastComponent } = useToast();

  const [extract, setExtract] = useState<ContractorExtract | null>(null);
  const [subName, setSubName] = useState<string>("");

  useEffect(() => {
    extractService.get(buildingId, contractorId, extractId).then((data) => {
      setExtract(data as unknown as ContractorExtract);
    });
    subcontractorService.get(contractorId).then((sub) => setSubName(sub.name));
  }, [buildingId, contractorId, extractId]);

  if (!extract) {
    return (
      <div className="p-8 text-center text-text-secondary">
        {isArabic ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  const handlePrint = () => {
    const rows = extract.items
      .map(
        (i, idx) =>
          `<tr><td>${idx + 1}</td><td>${i.itemCode}</td><td>${i.description}</td><td>${i.previous}</td><td>${i.current}</td><td>${i.total}</td><td>${i.executedQuantity}</td><td>${i.workValue}</td></tr>`
      )
      .join("");
    const dedRows = extract.deductions
      .map(
        (d) =>
          `<tr><td>${d.name}</td><td>${d.percent || ""}%</td><td>${d.amount}</td></tr>`
      )
      .join("");
    printHtml(
      extract.label,
      `<div class="header"><h1>${extract.label}</h1><p>${subName} | ${extract.date}</p></div>
      <table><thead><tr><th>م</th><th>كود</th><th>بيان</th><th>سابق</th><th>حالي</th><th>إجمالي</th><th>منفذ</th><th>قيمة</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>بيان الاستقطاعات</h3><table><thead><tr><th>البيان</th><th>%</th><th>المبلغ</th></tr></thead><tbody>${dedRows}</tbody></table>
      <p>الإجمالي: ${extract.totalWorkValue.toLocaleString()} | الاستقطاعات: ${extract.totalDeductions.toLocaleString()} | المستحق: ${extract.netPayable.toLocaleString()}</p>`
    );
  };

  const handleSaveSignatures = async (sigs: ContractorExtract["signatures"]) => {
    const updated = { ...extract, signatures: sigs };
    setExtract(updated);
  };

  return (
    <div className="min-h-screen bg-gray-light -m-6">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={base} />
            <div>
              <h1 className="text-2xl font-bold text-primary">{extract.label}</h1>
              <p className="text-sm text-text-secondary">
                {subName} | {extract.date}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {extract.status === "final" ? (
              <button
                disabled
                title={isArabic ? "المستخلص معتمد ولا يمكن تعديله" : "Final extract is locked"}
                className="flex items-center gap-2 px-4 py-2 border border-border text-text-muted rounded-lg cursor-not-allowed text-sm"
              >
                <Edit2 size={18} />
                {isArabic ? "تعديل (معتمد)" : "Edit (Approved)"}
              </button>
            ) : (
              <Link
                href={`${base}/${extractId}/edit`}
                className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-info rounded-lg hover:bg-info hover:text-white text-sm"
              >
                <Edit2 size={18} />
                {isArabic ? "تعديل" : "Edit"}
              </Link>
            )}
            <button
              onClick={() => {
                exportToCsv(
                  `${extract.label}.csv`,
                  ["كود", "بيان", "سابق", "حالي", "قيمة"],
                  extract.items.map((i) => [
                    i.itemCode,
                    i.description,
                    i.previous,
                    i.current,
                    i.workValue,
                  ])
                );
                showToast("تم", "success");
              }}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white text-sm"
            >
              <Download size={18} />
              Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              <Printer size={18} />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <ExtractSummaryCardsCompact
          isArabic={isArabic}
          totalWorkValue={extract.totalWorkValue}
          totalDeductions={extract.totalDeductions}
          netPayable={extract.netPayable}
        />

        <ExtractWorkItemsTable isArabic={isArabic} rows={extract.items} />

        <ExtractDeductionsTable
          isArabic={isArabic}
          deductions={extract.deductions as import("@/types/finance").ExtractDeduction[]}
          onChange={() => {}}
          onDeleteConfirm={() => {}}
          readOnly
        />

        <ExtractSummaryCards
          isArabic={isArabic}
          totalWorkValue={extract.totalWorkValue}
          totalDeductions={extract.totalDeductions}
          netPayable={extract.netPayable}
        />

        <Card className="p-4">
          <Link
            href={`/${locale}/projects/${projectId}/treasury`}
            className="text-sm text-primary hover:underline"
          >
            {isArabic
              ? "← عرض حركة الخزنة المرتبطة بهذا المستخلص"
              : "← View linked treasury transaction"}
          </Link>
        </Card>

        <SignaturesSection
          isArabic={isArabic}
          signatures={extract.signatures || []}
          onChange={handleSaveSignatures}
        />
      </div>
    </div>
  );
}
