"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Edit2, Download, Printer } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import DataLoader from "@/components/shared/DataLoader";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import SignaturesSection from "@/components/boq/SignaturesSection";
import ExtractDeductionsTable from "@/components/boq/ExtractDeductionsTable";
import ExtractSummaryCards from "@/components/boq/ExtractSummaryCards";
import { ExtractSummaryCardsCompact } from "@/components/boq/ExtractSummaryCards";
import ExtractWorkItemsTable from "@/components/boq/ExtractWorkItemsTable";
import OtherAmountsEditor from "@/components/boq/OtherAmountsEditor";
import { useToast } from "@/components/ui/Toast";
import { exportExtractToExcel } from "@/lib/boqExcel";
import { printHtmlDocument } from "@/lib/printUtils";
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
    return <DataLoader />;
  }

  const buildDocumentHtml = () => {
    const rows = extract.items
      .map(
        (i, idx) =>
          `<tr><td>${idx + 1}</td><td>${i.itemCode}</td><td class="desc">${i.description}</td><td>${i.unit}</td><td class="num">${i.previous.toLocaleString()}</td><td class="num">${i.current.toLocaleString()}</td><td class="num">${i.total.toLocaleString()}</td><td class="num">${i.executedQuantity.toLocaleString()}</td><td class="num">${i.workValue.toLocaleString()}</td></tr>`
      )
      .join("");
    const dedRows = extract.deductions
      .map((d) => {
        const pct = d.type === "manual" ? "—" : `${d.percent || 0}%`;
        return `<tr><td class="desc">${d.name}</td><td class="num">${pct}</td><td class="num">${d.amount.toLocaleString()}</td></tr>`;
      })
      .join("");
    const otherItems = extract.otherAmountItems ?? [];
    const otherItemsHtml =
      otherItems.length > 0
        ? `
      <div class="section-title">${
        isArabic ? "أخرى (بنود إضافية)" : "Other (additional items)"
      }</div>
      <table>
        <thead><tr><th>${
          isArabic ? "البيان" : "Description"
        }</th><th>${isArabic ? "المبلغ" : "Amount"}</th></tr></thead>
        <tbody>${otherItems
          .map(
            (i) =>
              `<tr><td class="desc">${i.name}</td><td class="num">${i.amount.toLocaleString()}</td></tr>`
          )
          .join("")}</tbody>
      </table>`
        : "";
    const otherAmounts = extract.otherAmounts ?? 0;
    const otherRow =
      otherAmounts > 0
        ? `<tr><td class="desc">${
            isArabic ? "+ أخرى" : "+ Other"
          }</td><td class="num">${otherAmounts.toLocaleString()}</td></tr>`
        : "";
    return `
  <body>
    <div style="text-align:center; margin-bottom:18px; font-size:13px; color:#475569;">
      ${isArabic ? "المقاول: " : "Contractor: "}<strong>${subName}</strong>
      ${isArabic ? "| التاريخ: " : "| Date: "}${extract.date}
      ${extract.runningNumber ? `${isArabic ? "| رقم المستخلص: " : "| Extract No.: "}${extract.runningNumber}` : ""}
    </div>
    <div class="section-title">${
      isArabic ? "بنود الأعمال" : "Work Items"
    }</div>
    <table>
      <thead><tr>
        <th>م</th><th>كود</th><th>بيان</th><th>وحدة</th><th>سابق</th><th>حالي</th><th>إجمالي</th><th>منفذ</th><th>قيمة</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="section-title">${
      isArabic ? "بيان الاستقطاعات" : "Deductions"
    }</div>
    <table>
      <thead><tr><th>البيان</th><th>%</th><th>المبلغ</th></tr></thead>
      <tbody>${dedRows}</tbody>
    </table>
    ${otherItemsHtml}
    <table style="width:60%; margin-top:16px;">
      <tbody>
        <tr><td class="desc" style="font-weight:700;">${
          isArabic ? "قيمة الأعمال" : "Work Value"
        }</td><td class="num">${extract.totalWorkValue.toLocaleString()}</td></tr>
        ${otherRow}
        <tr><td class="desc" style="font-weight:700;">${
          isArabic ? "خصم الاستقطاعات" : "Total Deductions"
        }</td><td class="num">${extract.totalDeductions.toLocaleString()}</td></tr>
        <tr style="background:#eaf6ee;"><td class="desc" style="font-weight:700; color:#0a7a33;">${
          isArabic ? "المستحق صرفة" : "Net Payable"
        }</td><td class="num" style="font-weight:700; color:#0a7a33;">${extract.netPayable.toLocaleString()}</td></tr>
      </tbody>
    </table>
  </body>
  `;
  };

  const handlePdf = async (logoUrl?: string) => {
    await printHtmlDocument(
      extract.label,
      buildDocumentHtml(),
      `${extract.label}.pdf`,
      { logoUrl },
      isArabic
    );
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    await exportExtractToExcel({
      title: extract.label,
      subtitle: `${subName} | ${extract.date}`,
      locale: isArabic ? "ar" : "en",
      items: extract.items,
      otherAmountItems: extract.otherAmountItems ?? [],
      deductions: extract.deductions.map((d) => ({
        name: d.name,
        percentLabel:
          d.type === "manual" || d.percent == null ? "—" : `${d.percent}%`,
        amount: d.amount,
      })),
      totalWorkValue: extract.totalWorkValue,
      otherAmounts: extract.otherAmounts ?? 0,
      totalDeductions: extract.totalDeductions,
      netPayable: extract.netPayable,
    });
    showToast(isArabic ? "تم التصدير" : "Exported", "success");
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
                className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white text-sm"
              >
                <Edit2 size={18} />
                {isArabic ? "تعديل" : "Edit"}
              </Link>
            )}
            <button
              onClick={handlePrintBrowser}
              className="flex items-center gap-2 px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface-secondary text-sm"
              title={isArabic ? "طباعة المتصفح" : "Browser print"}
            >
              <Printer size={18} />
              {isArabic ? "طباعة" : "Print"}
            </button>
            <PrintPdfButton
              label={isArabic ? "PDF" : "PDF"}
              onPrint={handlePdf}
            />
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white text-sm"
            >
              <Download size={18} />
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <ExtractSummaryCardsCompact
          isArabic={isArabic}
          totalWorkValue={extract.totalWorkValue}
          otherAmounts={extract.otherAmounts ?? 0}
          totalDeductions={extract.totalDeductions}
          netPayable={extract.netPayable}
        />

        {(extract.otherAmountItems ?? []).length > 0 && (
          <Card className="p-4">
            <OtherAmountsEditor
              isArabic={isArabic}
              items={extract.otherAmountItems ?? []}
              onChange={() => {}}
              readOnly
            />
          </Card>
        )}

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
          otherAmounts={extract.otherAmounts ?? 0}
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
