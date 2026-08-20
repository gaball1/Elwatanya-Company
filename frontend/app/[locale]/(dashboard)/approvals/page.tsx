/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import { Can } from '@/components/Can';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  User,
  FileText,
  MessageSquare,
  Send,
} from "lucide-react";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { approvalService, type Approval } from "@/services/approval.service";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { printAsPDF } from "@/lib/printUtils";
import { shortRef } from "@/lib/formatRef";

const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  extract: { ar: "خلاصة", en: "Extract" },
  purchase: { ar: "مشتريات", en: "Purchase" },
  leave: { ar: "إجازة", en: "Leave" },
  "fund-transaction": { ar: "معاملة مالية", en: "Fund Transaction" },
  "client-statement": { ar: "كشف عميل", en: "Client Statement" },
  "subcontractor-statement": { ar: "كشف مقاول", en: "Subcontractor Statement" },
  inventory: { ar: "مخزون", en: "Inventory" },
  estimate: { ar: "مقايسة", en: "Estimate" },
  boq: { ar: "مقايسة بنود", en: "BOQ" },
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  pending: { ar: "معلق", en: "Pending" },
  approved: { ar: "موافق", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
};

export default function ApprovalsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const { user } = useUser();
  const canDecide = !!(
    user?.roleNames?.some((r) => ["SUPER_ADMIN", "ADMIN", "GENERAL_MANAGER", "PROJECT_MANAGER"].includes(r)) ||
    user?.role === "CEO"
  );
  const isOwnRequest = (approval: Approval) => !!user && approval.requestedBy === user.id;

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const [requestForm, setRequestForm] = useState({ entityType: "extract", entityId: "", comment: "", status: "pending" });
  const [actionComment, setActionComment] = useState("");

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await approvalService.list();
      setApprovals(data.items);
      setTotal(data.total);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "draft", label: isArabic ? "مسودة" : "Draft" },
    { value: "pending", label: isArabic ? "معلق" : "Pending" },
    { value: "approved", label: isArabic ? "تمت الموافقة" : "Approved" },
    { value: "rejected", label: isArabic ? "مرفوض" : "Rejected" },
    { value: "cancelled", label: isArabic ? "ملغى" : "Cancelled" },
  ];

  const entityOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    ...Object.entries(ENTITY_LABELS).map(([key, val]) => ({ value: key, label: isArabic ? val.ar : val.en })),
  ];

  const filteredApprovals = useMemo(() => {
    let filtered = [...approvals];
    if (statusFilter !== "all") filtered = filtered.filter((a) => a.status === statusFilter);
    if (entityFilter !== "all") filtered = filtered.filter((a) => a.entityType === entityFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.entityType.toLowerCase().includes(term) ||
          a.entityId.toLowerCase().includes(term) ||
          a.comment?.toLowerCase().includes(term) ||
          a.requestedByName?.toLowerCase().includes(term) ||
          a.approvedByName?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [approvals, searchTerm, statusFilter, entityFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return { color: "bg-warning-light text-warning-dark", icon: Clock };
      case "approved": return { color: "bg-success-light text-success-dark", icon: CheckCircle2 };
      case "rejected": return { color: "bg-danger-light text-danger-dark", icon: XCircle };
      case "cancelled": return { color: "bg-surface-tertiary text-text-secondary", icon: XCircle };
      default: return { color: "bg-surface-tertiary text-text-secondary", icon: Clock };
    }
  };

  const getEntityLabel = (type: string) => {
    const labels = ENTITY_LABELS[type];
    return labels ? (isArabic ? labels.ar : labels.en) : type;
  };

  const handleRequestSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await approvalService.request({
        entityType: requestForm.entityType,
        entityId: requestForm.entityId,
        comment: requestForm.comment || undefined,
        status: requestForm.status === "draft" ? "draft" : undefined,
      });
      showToast(requestForm.status === "draft" ? (isArabic ? "تم حفظ المسودة" : "Draft saved") : (isArabic ? "تم إرسال طلب الموافقة" : "Approval request submitted"), "success");
      await fetchApprovals();
      setShowRequestModal(false);
      setRequestForm({ entityType: "extract", entityId: "", comment: "", status: "pending" });
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
    }
  }, [requestForm, isArabic, fetchApprovals]);

  const openActionModal = useCallback((approval: Approval, action: "approve" | "reject") => {
    setSelectedApproval(approval);
    setActionType(action);
    setActionComment("");
    setShowActionModal(true);
  }, []);

  const handleAction = useCallback(async () => {
    if (!selectedApproval) return;
    try {
      const body = actionComment ? { comment: actionComment } : undefined;
      if (actionType === "approve") {
        await approvalService.approve(selectedApproval.id, body);
        showToast(isArabic ? "تمت الموافقة" : "Approved", "success");
      } else {
        await approvalService.reject(selectedApproval.id, body);
        showToast(isArabic ? "تم الرفض" : "Rejected", "success");
      }
      await fetchApprovals();
      setShowActionModal(false);
      setSelectedApproval(null);
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
    }
  }, [selectedApproval, actionType, actionComment, isArabic, fetchApprovals]);

  const handleDraftAction = useCallback(async (approval: Approval, action: "submit" | "cancel") => {
    try {
      if (action === "submit") {
        await approvalService.submit(approval.id);
        showToast(isArabic ? "تم إرسال الطلب للموافقة" : "Request submitted for approval", "success");
      } else {
        await approvalService.cancel(approval.id);
        showToast(isArabic ? "تم إلغاء الطلب" : "Request cancelled", "success");
      }
      await fetchApprovals();
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
    }
  }, [isArabic, fetchApprovals]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "النوع" : "Type",
      isArabic ? "المرجع" : "Reference",
      isArabic ? "مقدم الطلب" : "Requester",
      isArabic ? "الموافق" : "Approver",
      isArabic ? "الحالة" : "Status",
      isArabic ? "الملاحظات" : "Comment",
      isArabic ? "تاريخ الطلب" : "Request Date",
    ];
    const rows = filteredApprovals.map((a) => [
      getEntityLabel(a.entityType),
      a.entityId,
      a.requestedByName || "—",
      a.approvedByName || "—",
      a.status,
      a.comment || "—",
      a.createdAt,
    ]);
    printAsPDF(rows, headers, isArabic ? "تقرير الموافقات" : "Approvals Report", isArabic, { logoUrl });
  }, [filteredApprovals, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = ["النوع", "المرجع", "مقدم الطلب", "الموافق", "الحالة", "الملاحظات", "تاريخ الطلب"];
    const rows = filteredApprovals.map((a) => [
      getEntityLabel(a.entityType),
      a.entityId,
      a.requestedByName || "",
      a.approvedByName || "",
      a.status,
      a.comment || "",
      a.createdAt,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `approvals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredApprovals, isArabic]);

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "الموافقات" : "Approvals"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "إدارة طلبات الموافقة" : "Manage approval requests"}</p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition">
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="approvals.create">
              <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "طلب موافقة" : "Request Approval"}
              </button>
            </Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold" />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold">
                {entityOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {isArabic ? `عرض ${filteredApprovals.length} من ${total}` : `Showing ${filteredApprovals.length} of ${total}`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredApprovals.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا يوجد طلبات موافقة مطابقة" : "No matching approvals found"}</p>
          </Card>
        ) : (
          <div className="bg-surface rounded-xl overflow-hidden border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-secondary">
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "النوع" : "Type"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "المرجع" : "Reference"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "مقدم الطلب" : "Requester"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "الموافق" : "Approver"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "الحالة" : "Status"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "الملاحظات" : "Comment"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-primary">{isArabic ? "تاريخ الطلب" : "Date"}</th>
                  <th className="text-center px-4 py-3 font-semibold text-text-primary">{isArabic ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((approval) => {
                  const badge = getStatusBadge(approval.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={approval.id} className="border-b last:border-0 hover:bg-surface-secondary/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-text-muted" />
                          <span className="font-medium text-text-primary">{getEntityLabel(approval.entityType)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-text-muted bg-surface-secondary px-2 py-1 rounded">{shortRef(approval.entityId)}</code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-text-muted" />
                          <span className="text-text-primary">{approval.requestedByName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-text-muted" />
                          <span className="text-text-primary">{approval.approvedByName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${badge.color}`}>
                          <BadgeIcon size={14} />
                          {STATUS_LABELS[approval.status] ? (isArabic ? STATUS_LABELS[approval.status].ar : STATUS_LABELS[approval.status].en) : approval.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{approval.comment || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{new Date(approval.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {approval.status === "draft" && (
                            <>
                              <Can permission="approvals.create">
                                <button onClick={() => handleDraftAction(approval, "submit")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                                  <Send size={14} />
                                  {isArabic ? "إرسال" : "Submit"}
                                </button>
                              </Can>
                              <Can permission="approvals.create">
                                <button onClick={() => handleDraftAction(approval, "cancel")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-tertiary text-text-secondary rounded-lg hover:bg-text-muted hover:text-white transition">
                                  <XCircle size={14} />
                                  {isArabic ? "إلغاء" : "Cancel"}
                                </button>
                              </Can>
                            </>
                          )}
                          {approval.status === "pending" && (
                            <>
                              {canDecide && !isOwnRequest(approval) && (
                                <>
                                  <Can permission="approvals.approve">
                                    <button onClick={() => openActionModal(approval, "approve")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-success-light text-success-dark rounded-lg hover:bg-success hover:text-white transition">
                                      <CheckCircle2 size={14} />
                                      {isArabic ? "موافقة" : "Approve"}
                                    </button>
                                  </Can>
                                  <Can permission="approvals.reject">
                                    <button onClick={() => openActionModal(approval, "reject")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-danger-light text-danger-dark rounded-lg hover:bg-danger hover:text-white transition">
                                      <XCircle size={14} />
                                      {isArabic ? "رفض" : "Reject"}
                                    </button>
                                  </Can>
                                </>
                              )}
                              <Can permission="approvals.create">
                                <button onClick={() => handleDraftAction(approval, "cancel")} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-tertiary text-text-secondary rounded-lg hover:bg-text-muted hover:text-white transition">
                                  <XCircle size={14} />
                                  {isArabic ? "إلغاء" : "Cancel"}
                                </button>
                              </Can>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "طلب موافقة جديد" : "New Approval Request"}</h2>
              <button onClick={() => setShowRequestModal(false)}><XCircle size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleRequestSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "النوع" : "Type"}</label>
                <select value={requestForm.entityType} onChange={(e) => setRequestForm((p) => ({ ...p, entityType: e.target.value }))} className="w-full p-3 border rounded-xl" required>
                  {Object.entries(ENTITY_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{isArabic ? val.ar : val.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "المعرف" : "Entity ID"}</label>
                <input type="text" value={requestForm.entityId} onChange={(e) => setRequestForm((p) => ({ ...p, entityId: e.target.value }))} className="w-full p-3 border rounded-xl" placeholder={isArabic ? "أدخل المعرف" : "Enter entity ID"} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "نوع الإرسال" : "Submission Type"}</label>
                <select value={requestForm.status} onChange={(e) => setRequestForm((p) => ({ ...p, status: e.target.value }))} className="w-full p-3 border rounded-xl">
                  <option value="pending">{isArabic ? "إرسال مباشر" : "Submit directly"}</option>
                  <option value="draft">{isArabic ? "حفظ كمسودة" : "Save as draft"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "ملاحظات" : "Comment"}</label>
                <textarea value={requestForm.comment} onChange={(e) => setRequestForm((p) => ({ ...p, comment: e.target.value }))} className="w-full p-3 border rounded-xl" rows={3} placeholder={isArabic ? "ملاحظات اختيارية" : "Optional comment"} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{isArabic ? "إرسال" : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showActionModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {actionType === "approve" ? (isArabic ? "تأكيد الموافقة" : "Confirm Approval") : (isArabic ? "تأكيد الرفض" : "Confirm Rejection")}
              </h2>
              <button onClick={() => setShowActionModal(false)}><XCircle size={24} className="text-text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-text-secondary">
                {isArabic
                  ? `هل أنت متأكد من ${actionType === "approve" ? "الموافقة على" : "رفض"} طلب ${getEntityLabel(selectedApproval.entityType)}؟`
                  : `Are you sure you want to ${actionType} this ${getEntityLabel(selectedApproval.entityType)} request?`}
              </p>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">{isArabic ? "ملاحظات" : "Comment"} <span className="text-text-muted">({isArabic ? "اختياري" : "optional"})</span></label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute right-3 top-3 text-text-muted" />
                  <textarea value={actionComment} onChange={(e) => setActionComment(e.target.value)} className="w-full p-3 pr-10 border rounded-xl" rows={3} placeholder={isArabic ? "أضف ملاحظات..." : "Add a comment..."} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowActionModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleAction} className={`flex-1 px-4 py-2 text-white rounded-xl ${actionType === "approve" ? "bg-success hover:bg-success-dark" : "bg-danger hover:bg-danger-dark"}`}>
                  {actionType === "approve" ? (isArabic ? "موافقة" : "Approve") : (isArabic ? "رفض" : "Reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
