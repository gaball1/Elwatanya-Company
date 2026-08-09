/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { Printer, Download, Edit2, Plus, X } from "lucide-react";
import { subcontractorStatementService, type SubcontractorStatement } from "@/services/subcontractor-statement.service";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/shared/BackButton";
import { printHtmlDocument } from "@/lib/printUtils";

interface Signature {
  id: string;
  name: string;
  title: string;
  date: string;
}

export default function StatementDetailsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const statementId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  const [statement, setStatement] = useState<SubcontractorStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [newSignature, setNewSignature] = useState({
    name: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    subcontractorStatementService.get(statementId).then((data) => {
      setStatement(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statementId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">...</p>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">
          {isArabic ? "المستخلص غير موجود" : "Statement not found"}
        </p>
      </div>
    );
  }

  const fallbackHref =
    statement.buildingId && statement.projectId
      ? `/${locale}/projects/${statement.projectId}/buildings/${statement.buildingId}/statements`
      : `/${locale}/statements`;

  const totalWorkValue =
    statement.items?.reduce((sum, item) => sum + (item.totalAmount || 0), 0) ||
    0;
  const totalInsurance =
    statement.items?.reduce(
      (sum, item) => sum + (item.insuranceAmount || 0),
      0
    ) || 0;
  const totalDeductions =
    statement.deductions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const netPayable =
    statement.netPayable ||
    totalWorkValue - totalInsurance - totalDeductions ||
    0;

  const signatures: Signature[] = (statement as any).signatures || [];

  const handlePrint = () => {
    const itemsHtml = (statement.items || [])
      .map(
        (item: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align:right">${item.itemName || "—"}</td>
          <td>${item.unit || "—"}</td>
          <td>${item.previous?.toLocaleString() || 0}</td>
          <td>${item.current?.toLocaleString() || 0}</td>
          <td>${item.executionPercent || 0}%</td>
          <td>${item.count || 1}</td>
          <td>${item.quantity?.toFixed(2) || 0}</td>
          <td>${item.price?.toLocaleString() || 0}</td>
          <td style="font-weight:700">${
            item.totalAmount?.toLocaleString() || 0
          }</td>
          <td>${statement.insurancePercent || 5}%</td>
          <td style="color:#e53935">${
            item.insuranceAmount?.toLocaleString() || 0
          }</td>
          <td style="color:#c9a03d;font-weight:700">${
            item.netAmount?.toLocaleString() || 0
          }</td>
        </tr>
      `
      )
      .join("");

    const deductionsHtml = (statement.deductions || [])
      .map(
        (d: any) => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ddd;font-size:12px;">
          <span>${d.name || "—"}</span>
          <span style="color:#e53935;font-weight:700">${
            d.amount?.toLocaleString() || 0
          }</span>
        </div>
      `
      )
      .join("");

    const signaturesHtml =
      signatures.length > 0
        ? `
        <div style="display:flex;justify-content:space-around;gap:30px;margin-top:30px;padding-top:20px;border-top:2px solid #ddd;flex-wrap:wrap;">
          ${signatures
            .map(
              (sig) => `
            <div style="flex:1;min-width:150px;text-align:center;padding-top:10px;">
              <div style="border-bottom:1px solid #333;width:80%;margin:0 auto 6px;height:30px;"></div>
              <div style="font-weight:700;color:#1e3a5f;font-size:14px;">${sig.name}</div>
              <div style="font-size:11px;color:#666;">${sig.title}</div>
              <div style="font-size:10px;color:#999;">${sig.date}</div>
            </div>
          `
            )
            .join("")}
        </div>
      `
        : "";

    const htmlContent = `
  <!DOCTYPE html>
  <html dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>${statement.statementNumber}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 20px; background: white; color: #1e3a5f; }
      .print-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #c9a03d; }
      .header h1 { font-size: 24px; font-weight: 900; color: #1e3a5f; margin: 0; }
      .header .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
      .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #c9a03d; }
      .info-item { display: flex; flex-direction: column; }
      .info-item .label { font-size: 11px; color: #999; font-weight: 600; }
      .info-item .value { font-size: 14px; font-weight: 700; color: #1e3a5f; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 15px 0 20px; }
      th { background-color: #1e3a5f; color: white; font-weight: 700; padding: 6px 4px; border: 1px solid #1e3a5f; text-align: center; }
      td { padding: 4px; border: 1px solid #ddd; text-align: center; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .summary { display: flex; justify-content: space-around; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
      .summary-box { flex: 1; min-width: 150px; padding: 12px 15px; border-radius: 8px; text-align: center; }
      .deductions-box { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #e53935; }
      @media print { body { padding: 10px; } }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="header">
        <h1>${isArabic ? "مستخلص أعمال جاري" : "Current Work Statement"}</h1>
        <div class="subtitle">${statement.statementNumber} | ${
      statement.date
    } | ${statement.subcontractorName}</div>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="label">${
          isArabic ? "المقاول" : "Subcontractor"
        }</span><span class="value">${statement.subcontractorName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "المشروع" : "Project"
        }</span><span class="value">${statement.projectName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "المبنى" : "Building"
        }</span><span class="value">${statement.buildingName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "البند" : "Work Type"
        }</span><span class="value">${statement.workType}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">م</th>
            <th rowspan="2">${isArabic ? "بيان الأعمال" : "Work"}</th>
            <th rowspan="2">${isArabic ? "الوحدة" : "Unit"}</th>
            <th colspan="2">${isArabic ? "الأعمال" : "Work"}</th>
            <th rowspan="2">${isArabic ? "نسبة التنفيذ" : "%"}</th>
            <th rowspan="2">${isArabic ? "العدد" : "Count"}</th>
            <th rowspan="2">${isArabic ? "الكمية" : "Qty"}</th>
            <th rowspan="2">${isArabic ? "الفئة" : "Price"}</th>
            <th rowspan="2">${isArabic ? "قيمة الأعمال" : "Value"}</th>
            <th colspan="2">${isArabic ? "التأمين" : "Insurance"}</th>
            <th rowspan="2">${isArabic ? "بعد التأمين" : "Net"}</th>
          </tr>
          <tr>
            <th>${isArabic ? "السابق" : "Prev"}</th>
            <th>${isArabic ? "الحالي" : "Curr"}</th>
            <th>%</th>
            <th>${isArabic ? "المبلغ" : "Amt"}</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:#f2f2f2">
            <td colspan="9" style="text-align:left">${
              isArabic ? "الإجمالي" : "Total"
            }</td>
            <td>${totalWorkValue.toLocaleString()}</td>
            <td></td>
            <td>${totalInsurance.toLocaleString()}</td>
            <td style="color:#c9a03d">${(
              totalWorkValue - totalInsurance
            ).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div class="deductions-box">
        <div style="font-weight:700;margin-bottom:8px;color:#1e3a5f">${
          isArabic ? "بيان الاستقطاعات" : "Deductions"
        }</div>
        ${
          deductionsHtml ||
          `<div style="color:#999;font-size:12px">${
            isArabic ? "لا توجد خصومات" : "No deductions"
          }</div>`
        }
        <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #1e3a5f">
          <span>${isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"}</span>
          <span style="color:#e53935">${totalDeductions.toLocaleString()}</span>
        </div>
      </div>

      <div class="summary">
        <div class="summary-box" style="background:#e8f5e9">
          <div style="font-size:12px;color:#666">${
            isArabic ? "إجمالي قيمة الأعمال" : "Total Work Value"
          }</div>
          <div style="font-size:18px;font-weight:900;color:#1e3a5f">${totalWorkValue.toLocaleString()}</div>
        </div>
        <div class="summary-box" style="background:#ffebee">
          <div style="font-size:12px;color:#666">${
            isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"
          }</div>
          <div style="font-size:18px;font-weight:900;color:#e53935">${totalDeductions.toLocaleString()}</div>
        </div>
        <div class="summary-box" style="background:#fff8e1;border:1px solid #c9a03d">
          <div style="font-size:12px;color:#666">${
            isArabic ? "المستحق صرفة" : "Net Payable"
          }</div>
          <div style="font-size:18px;font-weight:900;color:#c9a03d">${netPayable.toLocaleString()}</div>
        </div>
      </div>

      ${signaturesHtml}

      <div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #eee;font-size:10px;color:#999">
        ${
          isArabic
            ? "تم إنشاء هذا التقرير بواسطة النظام الآلي - الوطنية للتنمية العمرانية"
            : "Generated automatically - Al-Wataniya Urban Development"
        }
      </div>
    </div>
  </body>
  </html>
  `;

    printHtmlDocument(
      isArabic ? "مستخلص أعمال جاري" : "Current Work Statement",
      htmlContent,
      `${statement.statementNumber}.pdf`
    );
  };

  const exportToExcel = () => {
    if (!statement.items || statement.items.length === 0) {
      showToast(
        isArabic ? "لا توجد بيانات للتصدير" : "No data to export",
        "error"
      );
      return;
    }
    const headers = [
      "م",
      "بيان الأعمال",
      "الوحدة",
      "السابق",
      "الحالي",
      "%",
      "العدد",
      "الكمية",
      "السعر",
      "قيمة الأعمال",
      "التأمين%",
      "مبلغ التأمين",
      "الإجمالي بعد التأمين",
    ];
    const rows = statement.items.map((item: any, idx: number) => [
      idx + 1,
      item.itemName || "",
      item.unit || "",
      item.previous || 0,
      item.current || 0,
      item.executionPercent || 0,
      item.count || 1,
      item.quantity || 0,
      item.price || 0,
      item.totalAmount || 0,
      statement.insurancePercent || 5,
      item.insuranceAmount || 0,
      item.netAmount || 0,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `${statement.statementNumber || "statement"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  };

  const addSignature = () => {
    if (!newSignature.name) {
      showToast(isArabic ? "يرجى إدخال الاسم" : "Please enter name", "error");
      return;
    }
    const updatedSignatures = [
      ...signatures,
      { id: Date.now().toString(), ...newSignature },
    ];
    setStatement({ ...statement, signatures: updatedSignatures } as any);
    setShowSignatureModal(false);
    setNewSignature({
      name: "",
      title: "",
      date: new Date().toISOString().split("T")[0],
    });
    showToast(isArabic ? "تم إضافة التوقيع" : "Signature added", "success");
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={fallbackHref} />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {isArabic ? "مستخلص أعمال جاري" : "Current Work Statement"}
              </h1>
              <p className="text-sm text-text-secondary">
                {statement.date || "—"} | {isArabic ? "المشروع" : "Project"}:{" "}
                {statement.projectName || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/${locale}/statements/${statementId}/edit`}>
              <button className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white transition">
                <Edit2 size={18} /> {isArabic ? "تعديل" : "Edit"}
              </button>
            </Link>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
            >
              <Printer size={18} /> {isArabic ? "طباعة PDF" : "Print PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface p-4 rounded-lg shadow-sm border-r-4 border-gold">
            <p className="text-text-secondary text-sm">
              {isArabic ? "النموذج" : "Form"}
            </p>
            <p className="font-bold text-primary text-lg">
              {statement.formNumber || statement.statementNumber || "—"}
            </p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "اسم المقاول" : "Subcontractor"}
            </p>
            <p className="font-bold text-primary">
              {statement.subcontractorName || "—"}
            </p>
            <p className="text-xs text-gold">{statement.workType || "—"}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "المبنى" : "Building"}
            </p>
            <p className="font-bold text-primary">
              {statement.buildingName || "—"}
            </p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "رقم القطعة" : "Block No"}
            </p>
            <p className="font-bold text-primary">
              {statement.blockNumber || statement.statementNumber || "—"}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center" rowSpan={2}>
                    م
                  </th>
                  <th className="p-2 border text-right" rowSpan={2}>
                    {isArabic ? "بيان الأعمال" : "Work Description"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-2 border text-center" colSpan={2}>
                    {isArabic ? "الأعمال" : "Work"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "نسبة التنفيذ" : "Exec. %"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "عدد النماذج" : "Count"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الكمية المنفذة" : "Quantity"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الفئة" : "Price"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "قيمة الأعمال" : "Value"}
                  </th>
                  <th className="p-2 border text-center" colSpan={2}>
                    {isArabic ? "التأمين" : "Insurance"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الإجمالي بعد التأمين" : "Net"}
                  </th>
                </tr>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center">
                    {isArabic ? "السابق" : "Previous"}
                  </th>
                  <th className="p-2 border text-center">
                    {isArabic ? "الحالي" : "Current"}
                  </th>
                  <th className="p-2 border text-center">%</th>
                  <th className="p-2 border text-center">
                    {isArabic ? "المبلغ" : "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {statement.items && statement.items.length > 0 ? (
                  statement.items.map((item: any, idx: number) => (
                    <tr
                      key={item.id || idx}
                      className="border-t hover:bg-surface-secondary"
                    >
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">{item.itemName || "—"}</td>
                      <td className="p-2 border text-center">
                        {item.unit || "—"}
                      </td>
                      <td className="p-2 border text-center">
                        {item.previous?.toLocaleString() || 0}
                      </td>
                      <td className="p-2 border text-center">
                        {item.current?.toLocaleString() || 0}
                      </td>
                      <td className="p-2 border text-center">
                        {item.executionPercent || 0}%
                      </td>
                      <td className="p-2 border text-center">
                        {item.count || 1}
                      </td>
                      <td className="p-2 border text-center">
                        {item.quantity?.toFixed(2) || 0}
                      </td>
                      <td className="p-2 border text-center">
                        {item.price?.toLocaleString() || 0}
                      </td>
                      <td className="p-2 border text-center font-bold">
                        {item.totalAmount?.toLocaleString() || 0}
                      </td>
                      <td className="p-2 border text-center">
                        {statement.insurancePercent || 5}%
                      </td>
                      <td className="p-2 border text-center text-danger">
                        {item.insuranceAmount?.toLocaleString() || 0}
                      </td>
                      <td className="p-2 border text-center font-bold text-gold">
                        {item.netAmount?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-text-secondary">
                      {isArabic ? "لا توجد بنود" : "No items"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-surface-tertiary font-bold">
                <tr className="border-t">
                  <td colSpan={9} className="p-2 text-left">
                    {isArabic ? "الإجمالي" : "Total"}
                  </td>
                  <td className="p-2 text-center">
                    {totalWorkValue.toLocaleString()}
                  </td>
                  <td className="p-2 text-center"> </td>
                  <td className="p-2 text-center">
                    {totalInsurance.toLocaleString()}
                  </td>
                  <td className="p-2 text-center text-gold">
                    {(totalWorkValue - totalInsurance).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5">
            <h3 className="font-bold text-primary mb-3 border-b pb-2">
              {isArabic ? "بيان الاستقطاعات" : "Deductions Statement"}
            </h3>
            <div className="space-y-2">
              {statement.deductions && statement.deductions.length > 0 ? (
                statement.deductions.map((d: any, idx: number) => (
                  <div
                    key={d.id || idx}
                    className="flex justify-between text-sm py-1 border-b border-dashed"
                  >
                    <span>{d.name || "—"}</span>
                    <div className="flex gap-2">
                      {d.percent > 0 && (
                        <span className="text-text-secondary">{d.percent}%</span>
                      )}
                      <span className="font-bold text-danger">
                        {d.amount?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-text-secondary py-4">
                  {isArabic ? "لا توجد خصومات" : "No deductions"}
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t-2 border-primary font-bold">
                <span>
                  {isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"}
                </span>
                <span className="text-danger">
                  {totalDeductions.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5 bg-success-light">
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-primary">
                  {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {totalWorkValue.toLocaleString()}
                </span>
              </div>
            </Card>
            <Card className="p-5 bg-danger-light">
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-primary">
                  {isArabic ? "خصم الاستقطاعات" : "Deductions"}
                </span>
                <span className="text-2xl font-bold text-danger">
                  {totalDeductions.toLocaleString()}
                </span>
              </div>
            </Card>
            <Card className="p-5 bg-gold/10 border-gold">
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-primary">
                  {isArabic ? "المستحق صرفة" : "Net Payable"}
                </span>
                <span className="text-3xl font-bold text-gold">
                  {netPayable.toLocaleString()}
                </span>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary">
              {isArabic ? "التوقيعات" : "Signatures"}
            </h3>
            <button
              onClick={() => setShowSignatureModal(true)}
              className="flex items-center gap-1 text-sm text-gold hover:underline"
            >
              <Plus size={16} /> {isArabic ? "إضافة توقيع" : "Add Signature"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {signatures.map((sig) => (
              <div key={sig.id} className="border rounded-lg p-3 text-center">
                <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 h-8" />
                <p className="font-bold text-primary">{sig.name}</p>
                <p className="text-xs text-text-secondary">{sig.title}</p>
                <p className="text-xs text-text-muted">{sig.date}</p>
              </div>
            ))}
            {signatures.length === 0 && (
              <div className="col-span-full text-center text-text-muted text-sm py-4">
                {isArabic ? "لا توجد توقيعات" : "No signatures"}
              </div>
            )}
          </div>
        </Card>
      </div>

      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة توقيع" : "Add Signature"}
              </h2>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-text-muted hover:text-text-secondary"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الاسم" : "Name"}
                </label>
                <input
                  type="text"
                  value={newSignature.name}
                  onChange={(e) =>
                    setNewSignature({ ...newSignature, name: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder={isArabic ? "الاسم بالكامل" : "Full name"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المسمى الوظيفي" : "Title"}
                </label>
                <input
                  type="text"
                  value={newSignature.title}
                  onChange={(e) =>
                    setNewSignature({ ...newSignature, title: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder={isArabic ? "مدير المشروع" : "Project Manager"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "التاريخ" : "Date"}
                </label>
                <input
                  type="date"
                  value={newSignature.date}
                  onChange={(e) =>
                    setNewSignature({ ...newSignature, date: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="flex-1 px-4 py-2 border rounded-xl"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={addSignature}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl"
                >
                  {isArabic ? "إضافة" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
