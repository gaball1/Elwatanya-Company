/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  FileSignature,
  FileText,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { printHtml } from "@/lib/documentUtils";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { subcontractorContractService, type SubcontractorContract } from "@/services/subcontractor-contract.service";
import { contractorBoqService, type ContractorBoqItem } from "@/services/contractorBoq.service";
import { subcontractorService } from "@/services/subcontractor.service";
import DataLoader from "@/components/shared/DataLoader";
import { buildingService } from "@/services/building.service";
import { projectService } from "@/services/project.service";
import { companyService, type Company } from "@/services/company.service";
import { Can } from "@/components/Can";

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  active: { ar: "ساري", en: "Active" },
  completed: { ar: "مكتمل", en: "Completed" },
  terminated: { ar: "منتهي", en: "Terminated" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

export default function SubcontractorContractPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const subcontractorId = params.subcontractorId as string;

  const { showToast, ToastComponent } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<SubcontractorContract[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [building, setBuilding] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState<SubcontractorContract | null>(null);
  const [form, setForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    totalValue: "",
    terms: "",
    notes: "",
    status: "draft",
  });

  const selected = contracts.find((c) => c.id === selectedId) ?? contracts[0];

  const loadAll = useCallback(async () => {
    if (!buildingId || !subcontractorId) return;
    try {
      setLoading(true);
      const [contractList, items, subs, proj, bld] = await Promise.all([
        subcontractorContractService.list(buildingId, subcontractorId),
        contractorBoqService.list(buildingId, subcontractorId),
        subcontractorService.list(),
        projectService.getProject(projectId),
        buildingService.getBuilding(buildingId),
      ]);
      setContracts(contractList);
      setSelectedId((prev) => prev && contractList.some((c) => c.id === prev) ? prev : contractList[0]?.id ?? "");
      setBoqItems(items);
      setSub(subs.find((s: any) => s.id === subcontractorId));
      setProject(proj);
      setBuilding(bld);
    } catch (e) {
      console.error(e);
      showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [buildingId, subcontractorId, projectId, isArabic, showToast]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) loadAll();
  }, [mounted, loadAll]);

  useEffect(() => {
    let cancelled = false;
    companyService
      .get()
      .then((c) => { if (!cancelled) setCompany(c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const boqTotal = useMemo(
    () => boqItems.reduce((sum, i) => sum + i.totalValue, 0),
    [boqItems]
  );

  const openCreateModal = () => {
    setForm({
      title: isArabic ? `عقد أعمال ${sub?.name ?? ""}` : `Contract — ${sub?.name ?? ""}`,
      startDate: "",
      endDate: "",
      totalValue: String(boqTotal || ""),
      terms: "",
      notes: "",
      status: "draft",
    });
    setShowCreateModal(true);
  };

  const openEditModal = (contract: SubcontractorContract) => {
    setEditing(contract);
    setForm({
      title: contract.title,
      startDate: contract.startDate ? contract.startDate.split("T")[0] : "",
      endDate: contract.endDate ? contract.endDate.split("T")[0] : "",
      totalValue: String(contract.totalValue ?? ""),
      terms: (contract.terms ?? []).join("\n"),
      notes: contract.notes,
      status: contract.status,
    });
    setShowEditModal(true);
  };

  const submitCreate = async () => {
    try {
      const totalValue = Number(form.totalValue);
      if (!isNaN(totalValue) && totalValue < 0) {
        showToast(isArabic ? "القيمة غير صحيحة" : "Invalid total value", "error");
        return;
      }
      const contract = await subcontractorContractService.create({
        buildingId,
        subcontractorId,
        title: form.title,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        totalValue: isNaN(totalValue) ? undefined : totalValue,
        terms: form.terms
          ? form.terms.split("\n").map((t) => t.trim()).filter(Boolean)
          : undefined,
        notes: form.notes,
      });
      setShowCreateModal(false);
      await loadAll();
      setSelectedId(contract.id);
      showToast(isArabic ? "تم إنشاء العقد" : "Contract created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const totalValue = Number(form.totalValue);
      if (!isNaN(totalValue) && totalValue < 0) {
        showToast(isArabic ? "القيمة غير صحيحة" : "Invalid total value", "error");
        return;
      }
      await subcontractorContractService.update(editing.id, {
        title: form.title,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        totalValue: isNaN(totalValue) ? undefined : totalValue,
        terms: form.terms
          ? form.terms.split("\n").map((t) => t.trim()).filter(Boolean)
          : undefined,
        notes: form.notes,
        status: form.status,
      });
      setShowEditModal(false);
      setEditing(null);
      await loadAll();
      showToast(isArabic ? "تم تحديث العقد" : "Contract updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
  };

  const removeContract = async (contract: SubcontractorContract) => {
    if (!window.confirm(isArabic ? "حذف هذا العقد؟" : "Delete this contract?")) return;
    try {
      await subcontractorContractService.remove(contract.id);
      await loadAll();
      showToast(isArabic ? "تم الحذف" : "Deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
  };

  const handlePrint = (logoUrl?: string) => {
    if (!selected) return;

    const companyName = company?.arabicName || company?.name || "الوطنية للمقاولات والتوريدات";
    const companyDetails = [
      company?.address,
      company?.phone,
      company?.email,
    ].filter(Boolean).join(" | ");

    const headerHtml = `
<div style="
  display:flex;
  direction:ltr;
  justify-content:space-between;
  align-items:center;
  gap:25px;
  padding-bottom:20px;
  margin-bottom:25px;
  border-bottom:4px solid ${company?.primaryColor || "#1e3a5f"};
">
  <div style="flex:1;text-align:right;direction:rtl;">
    <div style="font-size:26px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};margin-bottom:5px;">
      ${companyName}
    </div>
    <div style="font-size:18px;font-weight:bold;color:${company?.secondaryColor || "#c9a03d"};margin-bottom:10px;">
      ${isArabic ? "عقد مقاولة" : "Subcontracting Contract"}
    </div>
    ${
      companyDetails
        ? `<div style="font-size:12px;color:#666;margin-bottom:8px;">${companyDetails}</div>`
        : ""
    }
    <table style="font-size:13px;border-collapse:collapse;">
      <tr>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "رقم العقد" : "Contract No."}</td>
        <td style="padding:4px 10px;">${selected.contractNumber}</td>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "التاريخ" : "Date"}</td>
        <td style="padding:4px 10px;">${new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</td>
      </tr>
      <tr>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "المشروع" : "Project"}</td>
        <td style="padding:4px 10px;">${project?.name ?? "-"}</td>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "المبنى" : "Building"}</td>
        <td style="padding:4px 10px;">${building?.name ?? "-"}</td>
      </tr>
      <tr>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "المقاول" : "Contractor"}</td>
        <td style="padding:4px 10px;">${sub?.name ?? "-"}</td>
        <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "نوع العمل" : "Work Type"}</td>
        <td style="padding:4px 10px;">${sub?.workType || "-"}</td>
      </tr>
      ${
        selected.startDate || selected.endDate
          ? `<tr>
              <td style="padding:4px 10px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "المدة" : "Duration"}</td>
              <td style="padding:4px 10px;">${selected.startDate ? new Date(selected.startDate).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "-"} → ${selected.endDate ? new Date(selected.endDate).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "-"}</td>
              <td colspan="2"></td>
            </tr>`
          : ""
      }
    </table>
  </div>
</div>
`;

    const rows = boqItems
      .map(
        (i, index) => `
<tr style="background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;font-weight:bold;">${i.itemCode}</td>
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;font-size:12px;line-height:1.7;">${i.description}</td>
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;">${i.unit}</td>
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${i.assignedQuantity.toLocaleString()}</td>
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-size:12px;">${i.unitPrice.toLocaleString()}</td>
  <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-size:13px;font-weight:bold;color:${company?.secondaryColor || "#c9a03d"};">${i.totalValue.toLocaleString()}</td>
</tr>
`
      )
      .join("");

    const totalQty = boqItems.reduce((sum, i) => sum + i.assignedQuantity, 0);
    const totalValue = selected.totalValue ?? boqTotal;

    const tableHtml = `
<table style="width:100%;border-collapse:collapse;margin-top:20px;font-family:Arial;">
  <thead>
    <tr style="background:${company?.primaryColor || "#1e3a5f"};color:white;">
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "الكود" : "Code"}</th>
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "البيان" : "Description"}</th>
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "الوحدة" : "Unit"}</th>
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "الكمية" : "Qty"}</th>
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "الفئة" : "Price"}</th>
      <th style="padding:10px;border:1px solid ${company?.primaryColor || "#1e3a5f"};font-size:13px;">${isArabic ? "القيمة" : "Total"}</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr style="background:${company?.primaryColor || "#1e3a5f"};color:white;font-weight:bold;">
      <td colspan="3" style="padding:12px;border:1px solid ${company?.primaryColor || "#1e3a5f"};text-align:center;font-size:14px;">${isArabic ? "الإجمالي" : "TOTAL"}</td>
      <td style="padding:12px;border:1px solid ${company?.primaryColor || "#1e3a5f"};text-align:center;font-size:14px;">${totalQty.toLocaleString()}</td>
      <td style="padding:12px;border:1px solid ${company?.primaryColor || "#1e3a5f"};"></td>
      <td style="padding:12px;border:1px solid ${company?.primaryColor || "#1e3a5f"};text-align:center;font-size:15px;color:#ffd166;">${totalValue.toLocaleString()}</td>
    </tr>
  </tbody>
</table>
`;

    const termsHtml = (selected.terms && selected.terms.length > 0)
      ? `
<div style="margin-top:25px;">
  <div style="font-size:15px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};margin-bottom:8px;">
    ${isArabic ? "شروط العقد" : "Contract Terms"}
  </div>
  <ol style="font-size:13px;color:#333;margin:0;padding-inline-start:20px;line-height:1.9;">
    ${selected.terms.map((t) => `<li>${t}</li>`).join("")}
  </ol>
</div>
`
      : "";

    const notesHtml = selected.notes
      ? `
<div style="margin-top:15px;font-size:13px;color:#555;">
  <span style="font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">${isArabic ? "ملاحظات: " : "Notes: "}</span>${selected.notes}
</div>
`
      : "";

    const signaturesHtml = `
<div style="margin-top:60px;display:flex;justify-content:space-between;gap:40px;page-break-inside:avoid;">
  <div style="flex:1;text-align:center;">
    <div style="border-top:2px solid #444;padding-top:12px;margin-bottom:8px;font-size:14px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">
      ${isArabic ? "توقيع المقاول" : "Contractor Signature"}
    </div>
    <div style="font-size:13px;font-weight:bold;color:#555;">${sub?.name ?? ""}</div>
    <div style="height:36px;"></div>
  </div>
  <div style="flex:1;text-align:center;">
    <div style="border-top:2px solid #444;padding-top:12px;margin-bottom:8px;font-size:14px;font-weight:bold;color:${company?.primaryColor || "#1e3a5f"};">
      ${isArabic ? "توقيع مدير الشركة" : "Company Manager Signature"}
    </div>
    <div style="font-size:13px;font-weight:bold;color:#555;">${companyName}</div>
    <div style="height:36px;"></div>
  </div>
</div>
`;

    const footerHtml = `
<div style="margin-top:35px;padding-top:12px;border-top:2px solid ${company?.primaryColor || "#1e3a5f"};text-align:center;font-size:12px;color:#666;">
  ${isArabic ? "تم إنشاء هذا العقد بواسطة نظام إدارة المقاولات" : "Generated by Construction ERP System"}
</div>
`;

    const html = `
<div style="font-family:Arial;padding:25px;">
  ${headerHtml}
  ${tableHtml}
  ${termsHtml}
  ${notesHtml}
  ${signaturesHtml}
  ${footerHtml}
</div>
`;

    printHtml(
      isArabic ? `عقد ${selected.contractNumber}` : `Contract ${selected.contractNumber}`,
      html,
      `
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
    background:${company?.primaryColor || "#1e3a5f"} !important;
    color:#fff !important;
    font-size:13px;
    font-weight:bold;
}
td{
    font-size:12px;
}
img{
    max-width:100%;
}
`,
      { logoUrl }
    );
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-light -m-6 flex items-center justify-center">
        <DataLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-light -m-4" suppressHydrationWarning>
      {ToastComponent}

      <div className="px-6 pb-6">
        {contracts.length === 0 ? (
          <div className="bg-surface rounded-xl p-12 text-center shadow-sm">
            <FileSignature size={56} className="mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-bold text-primary mb-2">
              {isArabic ? "لا يوجد عقد لهذا المقاول" : "No contract for this subcontractor"}
            </h3>
            <p className="text-sm text-text-muted mb-6">
              {isArabic
                ? "أنشئ العقد وسيتم تضمين بنود المقايسة وقيمة الأعمال"
                : "Create a contract and the BOQ items will be included"}
            </p>
            <Can permission="subcontractors.create">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark"
              >
                <Plus size={18} />
                {isArabic ? "إنشاء العقد" : "Create Contract"}
              </button>
            </Can>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <select
                  value={selected?.id ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="border rounded-lg p-2 text-sm focus:outline-none focus:border-gold"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber} — {STATUS_LABELS[c.status]?.[isArabic ? "ar" : "en"] ?? c.status}
                    </option>
                  ))}
                </select>
                {selected && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      selected.status === "active"
                        ? "bg-success-light text-success-dark"
                        : selected.status === "cancelled" || selected.status === "terminated"
                        ? "bg-danger-light text-danger-dark"
                        : "bg-surface-tertiary text-text-secondary"
                    }`}
                  >
                    {STATUS_LABELS[selected.status]?.[isArabic ? "ar" : "en"] ?? selected.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Can permission="subcontractors.create">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary-dark"
                  >
                    <Plus size={16} />
                    {isArabic ? "عقد جديد" : "New Contract"}
                  </button>
                </Can>
                {selected && (
                  <>
                    <Can permission="subcontractors.update">
                      <button
                        onClick={() => openEditModal(selected)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border-dark rounded-xl hover:bg-surface-secondary"
                      >
                        <Edit2 size={16} />
                        {isArabic ? "تعديل" : "Edit"}
                      </button>
                    </Can>
                    <PrintPdfButton
                      label={isArabic ? "طباعة" : "Print"}
                      size="sm"
                      onPrint={handlePrint}
                    />
                    <Can permission="subcontractors.delete">
                      <button
                        onClick={() => removeContract(selected)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-danger hover:bg-danger-light rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Can>
                  </>
                )}
              </div>
            </div>

            {selected && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-surface rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "رقم العقد" : "Contract No."}</p>
                  <p className="font-bold text-primary">{selected.contractNumber}</p>
                </div>
                <div className="bg-surface rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "القيمة الإجمالية" : "Total Value"}</p>
                  <p className="font-bold text-gold">{(selected.totalValue ?? boqTotal).toLocaleString()} ج.م</p>
                </div>
                <div className="bg-surface rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "المدة" : "Duration"}</p>
                  <p className="font-bold text-primary flex items-center gap-1.5">
                    <Calendar size={14} />
                    {selected.startDate ? new Date(selected.startDate).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "-"}
                    {" → "}
                    {selected.endDate ? new Date(selected.endDate).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "-"}
                  </p>
                </div>
              </div>
            )}

            {selected && (
              <div className="mt-4 bg-surface rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b font-bold text-primary flex items-center gap-2">
                  <FileText size={16} />
                  {isArabic ? "بنود المقايسة" : "BOQ Items"}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-secondary">
                      <tr>
                        <th className="p-3 text-center">#</th>
                        <th className="p-3">{isArabic ? "كود" : "Code"}</th>
                        <th className="p-3 text-right">{isArabic ? "بيان" : "Description"}</th>
                        <th className="p-3 text-center">{isArabic ? "الكمية" : "Qty"}</th>
                        <th className="p-3 text-center">{isArabic ? "الفئة" : "Price"}</th>
                        <th className="p-3 text-center">{isArabic ? "القيمة" : "Value"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-text-secondary">
                            {isArabic ? "لا توجد بنود مسندة" : "No assigned items"}
                          </td>
                        </tr>
                      ) : (
                        boqItems.map((item, idx) => (
                          <tr key={item.id ?? item.itemCode} className="border-t hover:bg-surface-secondary">
                            <td className="p-3 text-center">{idx + 1}</td>
                            <td className="p-3 font-mono">{item.itemCode}</td>
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-center">{item.assignedQuantity}</td>
                            <td className="p-3 text-center">{item.unitPrice.toLocaleString()}</td>
                            <td className="p-3 text-center font-bold text-gold">{item.totalValue.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {boqItems.length > 0 && (
                      <tfoot className="bg-surface-secondary">
                        <tr className="border-t-2 border-primary">
                          <td colSpan={5} className="p-3 font-bold text-primary">{isArabic ? "الإجمالي" : "Total"}</td>
                          <td className="p-3 text-center font-bold text-gold text-lg">
                            {boqTotal.toLocaleString()} ج.م
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "إنشاء عقد" : "Create Contract"}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-secondary text-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "عنوان العقد" : "Contract Title"}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "تاريخ البداية" : "Start Date"}</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "تاريخ النهاية" : "End Date"}</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "القيمة الإجمالية (ج.م)" : "Total Value (EGP)"}</label>
                <input
                  type="number"
                  value={form.totalValue}
                  onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="text-xs text-text-muted mt-1">
                  {isArabic ? "الإجمالي الحالي من المقايسة" : "Current BOQ total"}: {boqTotal.toLocaleString()} ج.م
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "شروط العقد (سطر لكل شرط)" : "Terms (one per line)"}</label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "ملاحظات" : "Notes"}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitCreate}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
                >
                  {isArabic ? "إنشاء" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "تعديل العقد" : "Edit Contract"}</h2>
              <button onClick={() => { setShowEditModal(false); setEditing(null); }} className="text-text-muted hover:text-text-secondary text-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "عنوان العقد" : "Contract Title"}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "تاريخ البداية" : "Start Date"}</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "تاريخ النهاية" : "End Date"}</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "القيمة الإجمالية (ج.م)" : "Total Value (EGP)"}</label>
                <input
                  type="number"
                  value={form.totalValue}
                  onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "حالة العقد" : "Contract Status"}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  {Object.entries(STATUS_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{isArabic ? val.ar : val.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "شروط العقد (سطر لكل شرط)" : "Terms (one per line)"}</label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "ملاحظات" : "Notes"}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowEditModal(false); setEditing(null); }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={submitEdit}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
