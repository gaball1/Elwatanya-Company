/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { Download, Edit2, Plus, X } from "lucide-react";
import { clientStatementService, type ClientStatement } from "@/services/client-statement.service";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/shared/BackButton";
import DataLoader from "@/components/shared/DataLoader";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { printHtmlDocument } from "@/lib/printUtils";
import { PDF_COLORS } from "@/lib/pdfColors";

export default function ClientStatementDetailsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const statementId = params.statementId as string;
  const printRef = useRef<HTMLDivElement>(null);
  const { showToast, ToastComponent } = useToast();

  const [statement, setStatement] = useState<ClientStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [newSignature, setNewSignature] = useState({
    name: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    clientStatementService.get(statementId).then((data) => {
      setStatement({
        ...data,
        items: (data.items || []).map((item: any, idx: number) => ({
          ...item,
          id: item?.id || `item-${idx}`,
          quantity: Number(item?.quantity ?? 0),
          unitPrice: Number(item?.unitPrice ?? 0),
          previous: Number(item?.previous ?? 0),
          current: Number(item?.current ?? 0),
          totalDone: Number(item?.totalDone ?? 0),
          final: Number(item?.final ?? 0),
          workValue: Number(item?.workValue ?? 0),
          deduction: Number(item?.deduction ?? 0),
          net: Number(item?.net ?? 0),
        })),
        totalWorkValue: Number(data.totalWorkValue ?? 0),
        totalDeductions: Number(data.totalDeductions ?? 0),
        netPayable: Number(data.netPayable ?? 0),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statementId]);

  if (loading) {
    return <DataLoader />;
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
  const handlePrint = (logoUrl?: string) => {
    const printContent = printRef.current;
    if (!printContent) return;

    const htmlContent = `
  <!DOCTYPE html>
  <html dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>${statement.statementNumber}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 20px; background: ${PDF_COLORS.white}; color: ${PDF_COLORS.primary}; }
      .print-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid ${PDF_COLORS.accent}; }
      .header h1 { font-size: 24px; font-weight: 900; color: ${PDF_COLORS.primary}; margin: 0; }
      .header .subtitle { font-size: 14px; color: ${PDF_COLORS.textLight}; margin-top: 5px; }
      .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; padding: 15px; background: ${PDF_COLORS.bg}; border-radius: 8px; border-right: 4px solid ${PDF_COLORS.accent}; }
      .info-item { display: flex; flex-direction: column; }
      .info-item .label { font-size: 11px; color: ${PDF_COLORS.textLight}; font-weight: 600; text-transform: uppercase; }
      .info-item .value { font-size: 14px; font-weight: 700; color: ${PDF_COLORS.primary}; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 15px 0 20px; }
      th { background-color: ${PDF_COLORS.primary}; color: ${PDF_COLORS.white}; font-weight: 700; padding: 6px 4px; border: 1px solid ${PDF_COLORS.primary}; text-align: center; }
      td { padding: 4px; border: 1px solid ${PDF_COLORS.border}; text-align: center; }
      tr:nth-child(even) { background-color: ${PDF_COLORS.bg}; }
      .text-gold { color: ${PDF_COLORS.accent}; }
      .text-red { color: ${PDF_COLORS.danger}; }
      @media print { body { padding: 10px; } }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="header">
        <h1>${statement.statementNumber}</h1>
        <div class="subtitle">${statement.date} | ${
      isArabic ? "العميل" : "Client"
    }: ${statement.clientName}</div>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="label">${
          isArabic ? "العميل" : "Client"
        }</span><span class="value">${statement.clientName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "المشروع" : "Project"
        }</span><span class="value">${statement.projectName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "المبنى" : "Building"
        }</span><span class="value">${statement.buildingName}</span></div>
        <div class="info-item"><span class="label">${
          isArabic ? "الحالة" : "Status"
        }</span><span class="value">${
      statement.status === "paid"
        ? isArabic
          ? "مدفوع"
          : "Paid"
        : statement.status === "pending"
        ? isArabic
          ? "معلق"
          : "Pending"
        : isArabic
        ? "مسودة"
        : "Draft"
    }</span></div>
      </div>

      <table>
        <thead><tr><th>م</th><th style="text-align:right">${
          isArabic ? "بيان الأعمال" : "Work Description"
        }</th><th>${isArabic ? "الوحدة" : "Unit"}</th><th>${
      isArabic ? "الكمية بالكراسة" : "Qty"
    }</th><th>${isArabic ? "الفئة" : "Price"}</th><th>${
      isArabic ? "السابق" : "Prev"
    }</th><th>${isArabic ? "الحالي" : "Curr"}</th><th>${
      isArabic ? "جملة ما تم" : "Total Done"
    }</th><th>${isArabic ? "نهائي" : "Final"}</th><th>${
      isArabic ? "جملة الأعمال" : "Work Value"
    }</th><th>${isArabic ? "الاستقطاع" : "Deduction"}</th><th>${
      isArabic ? "الباقي" : "Net"
    }</th><th>${isArabic ? "ملاحظات" : "Notes"}</th></tr></thead>
        <tbody>
          ${statement.items
            .map(
              (item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td style="text-align:right">${item.itemName}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>${item.unitPrice}</td>
              <td>${item.previous}</td>
              <td>${item.current}</td>
              <td>${item.totalDone}</td>
              <td>${item.final.toFixed(1)}%</td>
              <td style="font-weight:700">${item.workValue.toLocaleString()}</td>
              <td style="color:${PDF_COLORS.danger};font-weight:700">${item.deduction.toLocaleString()}</td>
              <td style="color:${PDF_COLORS.accent};font-weight:700">${item.net.toLocaleString()}</td>
              <td>${item.notes || ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:#f2f2f2">
            <td colspan="9" style="text-align:left">${
              isArabic ? "الإجمالي" : "Total"
            }</td>
            <td>${statement.totalWorkValue.toLocaleString()}</td>
            <td></td>
            <td style="color:${PDF_COLORS.accent}">${(
              statement.totalWorkValue - statement.totalDeductions
            ).toLocaleString()}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Summary - جنب بعض -->
      <div style="display:flex; justify-content:space-around; gap:20px; margin:20px 0; flex-wrap:wrap;">
        <div style="flex:1; min-width:150px; padding:12px 15px; border-radius:8px; text-align:center; background:#e8f5e9;">
          <div style="font-size:12px; color:${PDF_COLORS.textLight}; font-weight:600;">${
            isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"
          }</div>
          <div style="font-size:18px; font-weight:900; color:${PDF_COLORS.primary};">${statement.totalWorkValue.toLocaleString()}</div>
        </div>
        <div style="flex:1; min-width:150px; padding:12px 15px; border-radius:8px; text-align:center; background:#ffebee;">
          <div style="font-size:12px; color:${PDF_COLORS.textLight}; font-weight:600;">${
            isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"
          }</div>
          <div style="font-size:18px; font-weight:900; color:${PDF_COLORS.danger};">${statement.totalDeductions.toLocaleString()}</div>
        </div>
        <div style="flex:1; min-width:150px; padding:12px 15px; border-radius:8px; text-align:center; background:#fff8e1; border:1px solid ${PDF_COLORS.accent};">
          <div style="font-size:12px; color:${PDF_COLORS.textLight}; font-weight:600;">${
            isArabic ? "المستحق صرفة" : "Net Payable"
          }</div>
          <div style="font-size:18px; font-weight:900; color:${PDF_COLORS.accent};">${statement.netPayable.toLocaleString()}</div>
        </div>
      </div>

      <!-- Signatures - جنب بعض -->
      ${
        statement.signatures && statement.signatures.length > 0
          ? `
        <div style="display:flex; justify-content:space-around; gap:30px; margin-top:30px; padding-top:20px; border-top:2px solid #ddd; flex-wrap:wrap;">
          ${statement.signatures
            .map(
              (sig) => `
            <div style="flex:1; min-width:150px; text-align:center; padding-top:10px;">
              <div style="border-bottom:1px solid #333; width:80%; margin:0 auto 6px; height:30px;"></div>
              <div style="font-weight:700; color:${PDF_COLORS.primary}; font-size:14px;">${sig.name}</div>
              <div style="font-size:11px; color:${PDF_COLORS.textLight};">${sig.title}</div>
              <div style="font-size:10px; color:#999;">${sig.date}</div>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }

      <div style="text-align:center; margin-top:30px; padding-top:15px; border-top:1px solid #eee; font-size:10px; color:${PDF_COLORS.textLight};">
        ${
          isArabic
            ? "تم إنشاء هذا التقرير بواسطة النظام الآلي"
            : "This report was generated automatically"
        }
      </div>
    </div>
  </body>
  </html>
  `;

    printHtmlDocument(
      isArabic ? "كشف حساب عميل" : "Client Statement",
      htmlContent,
      `${statement.statementNumber}.pdf`,
      { logoUrl }
    );
  };

  const exportToExcel = () => {
    const headers = [
      "م",
      "بيان الأعمال",
      "الوحدة",
      "الكمية بالكراسة",
      "الفئة",
      "السابق",
      "الحالي",
      "جملة ما تم",
      "نهائي%",
      "جملة الأعمال",
      "الاستقطاع",
      "الباقي بعد الاستقطاع",
      "ملاحظات",
    ];
    const rows = statement.items.map((item, idx) => [
      idx + 1,
      item.itemName,
      item.unit,
      item.quantity,
      item.unitPrice,
      item.previous,
      item.current,
      item.totalDone,
      item.final.toFixed(1),
      item.workValue,
      item.deduction,
      item.net,
      item.notes,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${statement.statementNumber}.csv`);
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
      ...(statement.signatures || []),
      { id: Date.now().toString(), ...newSignature },
    ];
    setStatement({ ...statement, signatures: updatedSignatures });
    setShowSignatureModal(false);
    setNewSignature({
      name: "",
      title: "",
      date: new Date().toISOString().split("T")[0],
    });
    showToast(isArabic ? "تم إضافة التوقيع" : "Signature added", "success");
  };

  const fallbackHref =
    statement.buildingId && statement.projectId
      ? `/${locale}/projects/${statement.projectId}/buildings/${statement.buildingId}/client-statements`
      : `/${locale}/client-statements`;

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}

      {/* Header */}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={fallbackHref} />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {statement.statementNumber}
              </h1>
              <p className="text-sm text-text-secondary">
                {statement.date} | {isArabic ? "العميل" : "Client"}:{" "}
                {statement.clientName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/client-statements/${statementId}/edit`}>
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
            <PrintPdfButton
              label={isArabic ? "طباعة PDF" : "Print PDF"}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </div>

      {/* Content - للعرض وللطباعة */}
      <div ref={printRef} className="p-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface p-4 rounded-lg shadow-sm border-r-4 border-gold">
            <p className="text-text-secondary text-sm">
              {isArabic ? "العميل" : "Client"}
            </p>
            <p className="font-bold text-primary">{statement.clientName}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "المشروع" : "Project"}
            </p>
            <p className="font-bold text-primary">{statement.projectName}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "المبنى" : "Building"}
            </p>
            <p className="font-bold text-primary">{statement.buildingName}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg shadow-sm">
            <p className="text-text-secondary text-sm">
              {isArabic ? "الحالة" : "Status"}
            </p>
            <p
              className={`font-bold ${
                statement.status === "paid"
                  ? "text-success-dark"
                  : statement.status === "pending"
                  ? "text-warning-dark"
                  : "text-text-secondary"
              }`}
            >
              {statement.status === "paid"
                ? isArabic
                  ? "مدفوع"
                  : "Paid"
                : statement.status === "pending"
                ? isArabic
                  ? "معلق"
                  : "Pending"
                : isArabic
                ? "مسودة"
                : "Draft"}
            </p>
          </div>
        </div>

        {/* 13 Columns Table */}
        <Card className="overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    م
                  </th>
                  <th className="p-1.5 border text-right" rowSpan={2}>
                    {isArabic ? "بيان الأعمال" : "Work Description"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الكمية بالكراسة" : "Qty"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الفئة" : "Price"}
                  </th>
                  <th className="p-1.5 border text-center" colSpan={3}>
                    {isArabic ? "مقدار العمل" : "Work Done"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الحالة نهائي" : "Final"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "جملة الأعمال" : "Work Value"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الاستقطاع" : "Deduction"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "الباقي بعد الاستقطاع" : "Net"}
                  </th>
                  <th className="p-1.5 border text-center" rowSpan={2}>
                    {isArabic ? "ملاحظات" : "Notes"}
                  </th>
                </tr>
                <tr className="bg-primary text-white">
                  <th className="p-1.5 border text-center">
                    {isArabic ? "السابق" : "Prev"}
                  </th>
                  <th className="p-1.5 border text-center">
                    {isArabic ? "الحالي" : "Curr"}
                  </th>
                  <th className="p-1.5 border text-center">
                    {isArabic ? "جملة ما تم" : "Total Done"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {statement.items.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-surface-secondary">
                    <td className="p-1.5 border text-center">{idx + 1}</td>
                    <td className="p-1.5 border">{item.itemName}</td>
                    <td className="p-1.5 border text-center">{item.unit}</td>
                    <td className="p-1.5 border text-center">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">
                      {item.previous.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">
                      {item.current.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">
                      {item.totalDone.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">
                      {item.final.toFixed(1)}%
                    </td>
                    <td className="p-1.5 border text-center font-bold">
                      {item.workValue.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center text-danger">
                      {item.deduction.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center font-bold text-gold">
                      {item.net.toLocaleString()}
                    </td>
                    <td className="p-1.5 border text-center">{item.notes}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-tertiary font-bold">
                <tr className="border-t">
                  <td colSpan={9} className="p-2 text-left">
                    {isArabic ? "الإجمالي" : "Total"}
                  </td>
                  <td className="p-2 text-center">
                    {statement.totalWorkValue.toLocaleString()}
                  </td>
                  <td className="p-2 text-center"></td>
                  <td className="p-2 text-center text-gold">
                    {(
                      statement.totalWorkValue - statement.totalDeductions
                    ).toLocaleString()}
                  </td>
                  <td className="p-2 text-center"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Summary Cards - بدون جدول الاستقطاعات */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5 bg-success-light">
            <div className="flex justify-between items-center">
              <span className="font-bold text-text-primary">
                {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
              </span>
              <span className="text-2xl font-bold text-primary">
                {statement.totalWorkValue.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-5 bg-danger-light">
            <div className="flex justify-between items-center">
              <span className="font-bold text-text-primary">
                {isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"}
              </span>
              <span className="text-2xl font-bold text-danger">
                {statement.totalDeductions.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-5 bg-gold/10 border-gold">
            <div className="flex justify-between items-center">
              <span className="font-bold text-text-primary">
                {isArabic ? "المستحق صرفة" : "Net Payable"}
              </span>
              <span className="text-3xl font-bold text-gold">
                {statement.netPayable.toLocaleString()}
              </span>
            </div>
          </Card>
        </div>

        {/* Signatures Section */}
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
            {(statement.signatures || []).map((sig) => (
              <div key={sig.id} className="border rounded-lg p-3 text-center">
                <p className="font-bold text-primary">{sig.name}</p>
                <p className="text-xs text-text-secondary">{sig.title}</p>
                <p className="text-xs text-text-muted">{sig.date}</p>
              </div>
            ))}
            {(statement.signatures || []).length === 0 && (
              <div className="col-span-full text-center text-text-muted text-sm py-4">
                {isArabic ? "لا توجد توقيعات" : "No signatures"}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Signature Modal */}
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
