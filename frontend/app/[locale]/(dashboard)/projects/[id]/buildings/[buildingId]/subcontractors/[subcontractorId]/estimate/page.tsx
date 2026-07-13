/* eslint-disable */
"use client";
import { mockProjects, mockBuildings } from "@/lib/mockData";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, X, Layers } from "lucide-react";
import BoqPageHeader from "@/components/boq/BoqPageHeader";
import SignaturesSection from "@/components/boq/SignaturesSection";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { exportToCsv, printHtml } from "@/lib/documentUtils";
import {
  allocateContractorItem,
  getContractorBoq,
  getDocSignatures,
  getFinalItems,
  removeContractorItem,
  setDocSignatures,
  getFinalItemComponents,
  updateContractorItemQuantity,
  getAvailableQtyForContractorItem,
} from "@/lib/boqStore";
import { mockSubcontractors } from "@/lib/mockData";

export default function ContractorEstimatePage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const sub = mockSubcontractors.find((s) => s.id === contractorId);
  const docKey = `contractor-boq:${buildingId}:${contractorId}`;
  const back = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors`;
  const { showToast, ToastComponent } = useToast();
  const [, refresh] = useState(0);
  const items = getContractorBoq(buildingId, contractorId);
  const finalItems = getFinalItems(buildingId);
  const [sigs, setSigs] = useState(getDocSignatures(docKey));
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(0);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const bump = () => refresh((n) => n + 1);

  // ✅ منع Hydration Errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ تجهيز خيارات القائمة المنسدلة مع الكميات المتاحة
  const selectOptions = useMemo(() => {
    const options: {
      value: string;
      label: string;
      maxQty: number;
      unit: string;
      isComponent: boolean;
      parentItemCode?: string;
    }[] = [];

    finalItems.forEach((item) => {
      if (!item.isAnalyzed) {
        if (item.remainingQuantity > 0) {
          options.push({
            value: item.itemCode,
            label: `${item.itemCode} — ${item.description}`,
            maxQty: item.remainingQuantity,
            unit: item.unit,
            isComponent: false,
          });
        }
      } else {
        item.components.forEach((comp) => {
          if (comp.remainingQuantity > 0) {
            options.push({
              value: `${item.itemCode}|${comp.id}`,
              label: `${comp.name} (${item.description})`,
              maxQty: comp.remainingQuantity,
              unit: comp.unit,
              isComponent: true,
              parentItemCode: item.itemCode,
            });
          }
        });
      }
    });

    return options;
  }, [finalItems]);

  const selectedMaxQty = useMemo(() => {
    const option = selectOptions.find((opt) => opt.value === selected);
    return option?.maxQty || 0;
  }, [selected, selectOptions]);

  const selectedUnit = useMemo(() => {
    const option = selectOptions.find((opt) => opt.value === selected);
    return option?.unit || "";
  }, [selected, selectOptions]);

  const handleAdd = () => {
    if (!selected) {
      showToast(
        isArabic ? "يرجى اختيار بند" : "Please select an item",
        "error"
      );
      return;
    }

    if (qty <= 0) {
      showToast(
        isArabic ? "يرجى إدخال كمية صحيحة" : "Please enter a valid quantity",
        "error"
      );
      return;
    }

    if (qty > selectedMaxQty) {
      showToast(
        isArabic
          ? `الكمية المطلوبة (${qty}) تتجاوز الكمية المتاحة (${selectedMaxQty} ${selectedUnit})`
          : `Requested quantity (${qty}) exceeds available quantity (${selectedMaxQty} ${selectedUnit})`,
        "error"
      );
      return;
    }

    const res = allocateContractorItem(buildingId, contractorId, selected, qty);
    if (!res.ok) return showToast(res.error || "خطأ", "error");

    setSelected("");
    setQty(0);
    bump();
    showToast(
      isArabic ? "تم الإسناد بنجاح" : "Assigned successfully",
      "success"
    );
  };

  const saveEdit = () => {
    if (!editingItem) return;

    const maxQty = getAvailableQtyForContractorItem(
      buildingId,
      contractorId,
      editingItem.itemCode,
      editingItem.componentId
    );

    if (editQty > maxQty) {
      showToast(
        isArabic
          ? `الكمية المطلوبة (${editQty}) تتجاوز الكمية المتاحة (${maxQty})`
          : `Requested quantity (${editQty}) exceeds available quantity (${maxQty})`,
        "error"
      );
      return;
    }

    const res = updateContractorItemQuantity(
      buildingId,
      contractorId,
      editingItem.itemCode,
      editingItem.componentId,
      editQty
    );
    if (!res.ok) return showToast(res.error || "خطأ", "error");
    setEditingItem(null);
    bump();
    showToast(isArabic ? "تم التحديث" : "Updated", "success");
  };

  // ✅ منع التصيير على السيرفر
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">جاري التحميل...</div>
      </div>
    );
  }

  // ✅ عرض اسم المكون في الجدول
  const getDisplayDescription = (item: any) => {
    if (item.componentId) {
      const finalItem = finalItems.find((f) => f.itemCode === item.itemCode);
      if (finalItem) {
        const comp = finalItem.components.find(
          (c) => c.id === item.componentId
        );
        if (comp) {
          return `${comp.name} (${finalItem.description})`;
        }
      }
    }
    return item.description;
  };

  const handlePrint = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const logo = reader.result as string;

        const project = mockProjects.find((p) => p.id === projectId);
        const building = mockBuildings.find((b) => b.id === buildingId);

        const headerHtml = `
<div style="
display:flex;
direction:ltr;
justify-content:space-between;
align-items:center;
gap:25px;
padding-bottom:20px;
margin-bottom:25px;
border-bottom:4px solid #1e3a5f;
">

<div style="
display:flex;
align-items:center;
gap:15px;
flex-shrink:0;
">
${
  logo
    ? `
<img
src="${logo}"
style="
width:100px;
height:100px;
object-fit:contain;
"
/>
`
    : `
<div style="
width:100px;
height:100px;
border:3px dashed #c9a03d;
display:flex;
align-items:center;
justify-content:center;
border-radius:12px;
color:#c9a03d;
font-weight:bold;
font-size:14px;
flex-shrink:0;
">
Logo
</div>
`
}
</div>

<div style="flex:1;text-align:right;direction:rtl;">

<div style="
font-size:28px;
font-weight:bold;
color:#1e3a5f;
margin-bottom:5px;
">
${isArabic ? "الوطنية للمقاولات والتوريدات" : "Al Wataniya Contracting"}
</div>

<div style="
font-size:18px;
font-weight:bold;
color:#c9a03d;
margin-bottom:18px;
">
${isArabic ? "مقايسة المقاول" : "Contractor BOQ"}
</div>

<table style="
font-size:13px;
border-collapse:collapse;
">

<tr>
<td style="padding:5px 10px;font-weight:bold;color:#1e3a5f;">
${isArabic ? "المشروع" : "Project"}
</td>

<td style="padding:5px 10px;">
${project?.name ?? "-"}
</td>
</tr>

<tr>
<td style="padding:5px 10px;font-weight:bold;color:#1e3a5f;">
${isArabic ? "المبنى" : "Building"}
</td>

<td style="padding:5px 10px;">
${building?.name ?? "-"}
</td>
</tr>

<tr>
<td style="padding:5px 10px;font-weight:bold;color:#1e3a5f;">
${isArabic ? "المقاول" : "Contractor"}
</td>

<td style="padding:5px 10px;">
${sub?.name ?? "-"}
</td>
</tr>

<tr>
<td style="padding:5px 10px;font-weight:bold;color:#1e3a5f;">
${isArabic ? "التاريخ" : "Date"}
</td>

<td style="padding:5px 10px;">
${new Date().toLocaleDateString()}
</td>
</tr>

</table>

</div>

</div>
`;

        const total = items.reduce((sum, i) => sum + i.totalValue, 0);
        const totalQty = items.reduce((sum, i) => sum + i.assignedQuantity, 0);

        const rows = items
          .map(
            (i, index) => `
<tr
style="
background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};
">

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:center;
font-size:13px;
font-weight:bold;
">
${i.itemCode}
</td>

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:right;
font-size:13px;
line-height:1.8;
">
${getDisplayDescription(i)}
</td>

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:center;
font-size:13px;
">
${i.unit}
</td>

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:center;
font-size:13px;
font-weight:bold;
color:#1e3a5f;
">
${i.assignedQuantity.toLocaleString()}
</td>

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:center;
font-size:13px;
">
${i.unitPrice.toLocaleString()}
</td>

<td style="
padding:12px;
border:1px solid #cbd5e1;
text-align:center;
font-size:14px;
font-weight:bold;
color:#c9a03d;
">
${i.totalValue.toLocaleString()}
</td>

</tr>
`
          )
          .join("");

        const totalRow = `
<tr
style="
background:#1e3a5f;
color:white;
font-weight:bold;
">

<td
colspan="3"
style="
padding:14px;
border:1px solid #1e3a5f;
text-align:center;
font-size:15px;
">
${isArabic ? "الإجمالي" : "TOTAL"}
</td>

<td
style="
padding:14px;
border:1px solid #1e3a5f;
text-align:center;
font-size:15px;
">
${totalQty.toLocaleString()}
</td>

<td
style="
padding:14px;
border:1px solid #1e3a5f;
">
</td>

<td
style="
padding:14px;
border:1px solid #1e3a5f;
text-align:center;
font-size:16px;
color:#ffd166;
">
${total.toLocaleString()}
</td>

</tr>
`;

        const tableHtml = `
<table
style="
width:100%;
border-collapse:collapse;
margin-top:20px;
font-family:Arial;
">

<thead>

<tr
style="
background:#1e3a5f;
color:white;
">

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "الكود" : "Code"}
</th>

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "البيان" : "Description"}
</th>

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "الوحدة" : "Unit"}
</th>

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "الكمية" : "Qty"}
</th>

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "الفئة" : "Price"}
</th>

<th style="padding:12px;border:1px solid #1e3a5f;font-size:14px;">
${isArabic ? "القيمة" : "Total"}
</th>

</tr>

</thead>

<tbody>

${rows}

${totalRow}

</tbody>

</table>
`;

        const signaturesHtml = `
<div
style="
margin-top:55px;
display:flex;
justify-content:space-between;
gap:30px;
page-break-inside:avoid;
">

${sigs
  .map(
    (s) => `
<div
style="
flex:1;
text-align:center;
">

<div
style="
border-top:2px solid #444;
padding-top:12px;
margin-bottom:8px;
font-size:15px;
font-weight:bold;
color:#1e3a5f;
">
${s.title}
</div>

<div
style="
font-size:14px;
font-weight:bold;
margin-bottom:5px;
">
${s.name || ""}
</div>

${
  s.date
    ? `
<div
style="
font-size:12px;
color:#777;
">
${s.date}
</div>
`
    : ""
}

</div>
`
  )
  .join("")}

</div>
`;

        const footerHtml = `
<div
style="
margin-top:35px;
padding-top:12px;
border-top:2px solid #1e3a5f;
text-align:center;
font-size:12px;
color:#666;
">

${
  isArabic
    ? "تم إنشاء هذا التقرير بواسطة نظام إدارة المقاولات"
    : "Generated by Construction ERP System"
}

</div>
`;

        const html = `
<div
style="
font-family:Arial;
padding:25px;
">

${headerHtml}

${tableHtml}

${signaturesHtml}

${footerHtml}

</div>
`;

        printHtml(
          isArabic ? "مقايسة المقاول" : "Contractor BOQ",
          html,
          `
<style>
@page{
    size:A4 portrait;
    margin:15mm;
}
*{
    box-sizing:border-box;
}
body{
    direction:${isArabic ? "rtl" : "ltr"};
    font-family:Arial,Tahoma,sans-serif;
    color:#222;
    background:white;
    margin:0;
    padding:0;
}
table{
    width:100%;
    border-collapse:collapse;
}
thead{
    display:table-header-group;
}
tfoot{
    display:table-footer-group;
}
tr{
    page-break-inside:avoid;
}
th{
    background:#1e3a5f !important;
    color:#fff !important;
    font-size:14px;
    font-weight:bold;
}
td{
    font-size:13px;
}
img{
    max-width:100%;
}
</style>
`
        );
      };

      reader.readAsDataURL(file);
    };

    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-light -m-4" suppressHydrationWarning>
      {ToastComponent}

      <BoqPageHeader
        title={
          isArabic ? `مقايسة ${sub?.name || ""}` : `${sub?.name || ""} BOQ`
        }
        subtitle={isArabic ? "بنود المقاول" : "Contractor items"}
        fallbackHref={back}
        isArabic={isArabic}
        onExport={() => {
          if (!items.length)
            return showToast(isArabic ? "لا توجد بيانات" : "No data", "error");
          exportToCsv(
            "contractor-boq.csv",
            ["كود", "بيان", "مسند", "فئة", "المصدر"],
            items.map((i) => [
              i.itemCode,
              getDisplayDescription(i),
              i.assignedQuantity,
              i.unitPrice,
              i.componentId
                ? isArabic
                  ? "مكون"
                  : "Component"
                : isArabic
                ? "بند مباشر"
                : "Direct",
            ])
          );
        }}
        onPrint={handlePrint}
      />

      <div className="px-6 pb-6" suppressHydrationWarning>
        {/* ✅ إسناد بند للمقاول */}
        <div
          className="bg-white rounded-xl p-4 mb-4 shadow-sm"
          suppressHydrationWarning
        >
          <p className="text-sm text-gray-500 mb-3">
            {isArabic ? "إسناد بند للمقاول" : "Assign item to contractor"}
          </p>

          <div className="flex flex-nowrap items-center gap-2">
            {/* Select */}
            <div className="flex-1 min-w-0 relative">
              <select
                id="item-select"
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setQty(0);
                }}
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-gold"
                suppressHydrationWarning
              >
                <option value="">
                  {isArabic
                    ? "-- اختر من النهائية --"
                    : "-- Select from final --"}
                </option>
                {selectOptions.length === 0 ? (
                  <option value="" disabled>
                    {isArabic ? "لا توجد بنود متاحة" : "No items available"}
                  </option>
                ) : (
                  selectOptions.map((opt, idx) => (
                    <option key={idx} value={opt.value}>
                      {opt.label} — {isArabic ? "متاح" : "Available"}:{" "}
                      {opt.maxQty} {opt.unit}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Input */}
            <div className="w-24 flex-shrink-0">
              <input
                id="qty-input"
                type="number"
                value={qty || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (selected && val > selectedMaxQty) {
                    showToast(
                      isArabic
                        ? `الكمية لا يمكن أن تتجاوز ${selectedMaxQty} ${selectedUnit}`
                        : `Quantity cannot exceed ${selectedMaxQty} ${selectedUnit}`,
                      "error"
                    );
                    return;
                  }
                  setQty(val);
                }}
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-gold"
                placeholder={isArabic ? "كمية" : "Qty"}
                min={1}
                max={selectedMaxQty || undefined}
                disabled={!selected}
                suppressHydrationWarning
              />
            </div>

            {/* Button */}
            <button
              onClick={handleAdd}
              disabled={!selected || qty <= 0}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-1 flex-shrink-0 whitespace-nowrap ${
                !selected || qty <= 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark"
              }`}
              suppressHydrationWarning
            >
              <Plus size={16} />
              {isArabic ? "إسناد" : "Assign"}
            </button>
          </div>

          {/* ✅ الكمية المتاحة */}
          {selected && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold"></span>
              {isArabic ? "الحد الأقصى" : "Max"}: {selectedMaxQty}{" "}
              {selectedUnit}
            </div>
          )}
        </div>

        {/* ✅ جدول البنود */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          suppressHydrationWarning
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-center">#</th>
                  <th className="p-3">{isArabic ? "كود" : "Code"}</th>
                  <th className="p-3 text-right">
                    {isArabic ? "بيان" : "Description"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "مسند" : "Assigned"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "فئة" : "Price"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "قيمة" : "Value"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "المصدر" : "Source"}
                  </th>
                  <th className="p-3 text-center">
                    {isArabic ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      {isArabic ? "لا توجد بنود مسندة" : "No assigned items"}
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const displayDescription = getDisplayDescription(item);
                    const isComponent = !!item.componentId;

                    return (
                      <tr
                        key={item.itemCode + (item.componentId || "")}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-3 text-center">{idx + 1}</td>
                        <td className="p-3 font-mono">{item.itemCode}</td>
                        <td className="p-3">
                          {displayDescription}
                          {isComponent && (
                            <span
                              className="text-xs text-gold mr-2"
                              title={
                                isArabic
                                  ? "من مكون متحلل"
                                  : "From analyzed component"
                              }
                            >
                              <Layers size={12} className="inline" />
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.assignedQuantity}
                        </td>
                        <td className="p-3 text-center">
                          {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold text-gold">
                          {item.totalValue.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isComponent
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isComponent
                              ? isArabic
                                ? "مكون"
                                : "Component"
                              : isArabic
                              ? "مباشر"
                              : "Direct"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setEditQty(item.assignedQuantity);
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              suppressHydrationWarning
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="text-red-500 hover:text-red-700"
                              suppressHydrationWarning
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr className="border-t-2 border-primary">
                    <td colSpan={5} className="p-3 font-bold text-primary">
                      {isArabic ? "الإجمالي" : "Total"}
                    </td>
                    <td className="p-3 text-center font-bold text-gold text-lg">
                      {items
                        .reduce((sum, i) => sum + i.totalValue, 0)
                        .toLocaleString()}{" "}
                      ج.م
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <SignaturesSection
          isArabic={isArabic}
          signatures={sigs}
          onChange={(n) => {
            setSigs(n);
            setDocSignatures(docKey, n);
          }}
        />
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-primary">{editingItem.itemCode}</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-500">
                {isArabic ? "الكمية الحالية" : "Current quantity"}: {editQty}
              </label>
              <input
                type="number"
                value={editQty}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const maxQty = getAvailableQtyForContractorItem(
                    buildingId,
                    contractorId,
                    editingItem.itemCode,
                    editingItem.componentId
                  );
                  if (val > maxQty) {
                    showToast(
                      isArabic
                        ? `الكمية لا يمكن أن تتجاوز ${maxQty}`
                        : `Quantity cannot exceed ${maxQty}`,
                      "error"
                    );
                  } else {
                    setEditQty(val);
                  }
                }}
                className="w-full p-3 border rounded-xl mt-1"
                min={1}
                suppressHydrationWarning
              />
            </div>
            <button
              onClick={saveEdit}
              className="w-full py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
              suppressHydrationWarning
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingItem && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={
            isArabic
              ? "حذف البند وإرجاع الكمية؟"
              : "Delete item and return quantity?"
          }
          onCancel={() => setDeletingItem(null)}
          onConfirm={() => {
            removeContractorItem(
              buildingId,
              contractorId,
              deletingItem.itemCode,
              deletingItem.componentId
            );
            setDeletingItem(null);
            bump();
            showToast(isArabic ? "تم الحذف" : "Deleted", "success");
          }}
        />
      )}
    </div>
  );
}
