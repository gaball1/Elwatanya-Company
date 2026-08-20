/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import DataLoader from "@/components/shared/DataLoader";
import ExportButtons from "@/components/shared/ExportButtons";
import { changeOrderService, type ChangeOrder } from "@/services/change-order.service";
import { FileEdit, Plus, X, Check, Trash2, Eye, AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { ar: string; en: string; className: string }> = {
  draft: { ar: "مسودة", en: "Draft", className: "bg-gray-100 text-gray-600" },
  pending: { ar: "قيد المراجعة", en: "Pending", className: "bg-yellow-100 text-yellow-700" },
  approved: { ar: "معتمد", en: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { ar: "مرفوض", en: "Rejected", className: "bg-red-100 text-red-700" },
};

function StatusBadge({ status, isArabic }: { status: string; isArabic: boolean }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {isArabic ? cfg.ar : cfg.en}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChangeOrdersPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", reason: "", changeAmount: "" });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ChangeOrder | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ChangeOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ChangeOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await changeOrderService.list(projectId);
      setOrders(data);
    } catch {
      showToast(isArabic ? "فشل تحميل أوامر التغيير" : "Failed to load change orders", "error");
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast, isArabic]);

  useEffect(() => {
    if (projectId) fetchOrders();
  }, [projectId, fetchOrders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const approved = orders.filter((o) => o.status === "approved").length;
    const totalChanges = orders.reduce((s, o) => s + o.changeAmount, 0);
    return { total, pending, approved, totalChanges };
  }, [orders]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      showToast(isArabic ? "العنوان مطلوب" : "Title is required", "error");
      return;
    }
    const amt = parseFloat(createForm.changeAmount);
    if (isNaN(amt)) {
      showToast(isArabic ? "المبلغ غير صحيح" : "Invalid amount", "error");
      return;
    }
    setCreating(true);
    try {
      await changeOrderService.create({
        projectId,
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        reason: createForm.reason.trim() || undefined,
        changeAmount: amt,
      });
      showToast(isArabic ? "تم إنشاء أمر التغيير" : "Change order created", "success");
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", reason: "", changeAmount: "" });
      await fetchOrders();
    } catch {
      showToast(isArabic ? "فشل إنشاء أمر التغيير" : "Failed to create change order", "error");
    } finally {
      setCreating(false);
    }
  }, [createForm, projectId, showToast, isArabic, fetchOrders]);

  const handleApprove = useCallback(async (order: ChangeOrder) => {
    try {
      await changeOrderService.approve(order.id);
      showToast(isArabic ? "تم اعتماد أمر التغيير" : "Change order approved", "success");
      await fetchOrders();
    } catch {
      showToast(isArabic ? "فشل الاعتماد" : "Failed to approve", "error");
    }
  }, [showToast, isArabic, fetchOrders]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      showToast(isArabic ? "سبب الرفض مطلوب" : "Rejection reason is required", "error");
      return;
    }
    setRejecting(true);
    try {
      await changeOrderService.reject(rejectTarget.id, rejectReason.trim());
      showToast(isArabic ? "تم رفض أمر التغيير" : "Change order rejected", "success");
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
      await fetchOrders();
    } catch {
      showToast(isArabic ? "فشل الرفض" : "Failed to reject", "error");
    } finally {
      setRejecting(false);
    }
  }, [rejectTarget, rejectReason, showToast, isArabic, fetchOrders]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await changeOrderService.delete(deleteTarget.id);
      showToast(isArabic ? "تم حذف أمر التغيير" : "Change order deleted", "success");
      setDeleteTarget(null);
      await fetchOrders();
    } catch {
      showToast(isArabic ? "فشل الحذف" : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, showToast, isArabic, fetchOrders]);

  if (loading) return <DataLoader />;

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      <div className="flex justify-between items-center" suppressHydrationWarning>
        <div className="flex items-center gap-3">
          <FileEdit size={24} className="text-primary" />
          <h2 className="text-lg font-bold text-primary">
            {isArabic ? "أوامر التغيير" : "Change Orders"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={orders}
            columns={[
              { key: "changeNumber", labelAr: "رقم", labelEn: "#" },
              { key: "title", labelAr: "العنوان", labelEn: "Title" },
              { key: "status", labelAr: "الحالة", labelEn: "Status", format: (v: string) => isArabic ? (statusConfig[v]?.ar ?? v) : (statusConfig[v]?.en ?? v) },
              { key: "originalAmount", labelAr: "المبلغ الأصلي", labelEn: "Original", format: (v: number) => fmt(v) },
              { key: "changeAmount", labelAr: "مبلغ التغيير", labelEn: "Change", format: (v: number) => fmt(v) },
              { key: "newAmount", labelAr: "المبلغ الجديد", labelEn: "New", format: (v: number) => fmt(v) },
            ]}
            titleAr="تقرير أوامر التغيير"
            titleEn="Change Orders Report"
            filename={`change_orders_${projectId}`}
            locale={locale}
          />
          <button
            onClick={() => {
              setCreateForm({ title: "", description: "", reason: "", changeAmount: "" });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition"
          >
            <Plus size={16} />
            {isArabic ? "أمر تغيير جديد" : "New Change Order"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" suppressHydrationWarning>
        <Card className="p-4 border-r-4 border-info" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">{isArabic ? "إجمالي الأوامر" : "Total Orders"}</p>
          <p className="text-2xl font-bold text-info">{stats.total}</p>
        </Card>
        <Card className="p-4 border-r-4 border-warning" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">{isArabic ? "قيد المراجعة" : "Pending"}</p>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-r-4 border-success" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">{isArabic ? "معتمد" : "Approved"}</p>
          <p className="text-2xl font-bold text-success-dark">{stats.approved}</p>
        </Card>
        <Card className="p-4 border-r-4 border-gold" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">{isArabic ? "إجمالي التغييرات" : "Total Changes"}</p>
          <p className="text-2xl font-bold text-gold">{fmt(stats.totalChanges)}</p>
        </Card>
      </div>

      {/* Change Orders List */}
      {orders.length === 0 ? (
        <Card className="p-8 text-center" suppressHydrationWarning>
          <FileEdit size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">
            {isArabic ? "لا توجد أوامر تغيير بعد" : "No change orders yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3" suppressHydrationWarning>
          {orders.map((order) => (
            <Card key={order.id} className="p-4" suppressHydrationWarning>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-text-muted">#{order.changeNumber}</span>
                    <h3 className="font-bold text-primary truncate">{order.title}</h3>
                    <StatusBadge status={order.status} isArabic={isArabic} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary mt-2">
                    <span>
                      {isArabic ? "الأصلي:" : "Original:"}{" "}
                      <span className="font-medium text-text-primary">{fmt(order.originalAmount)}</span>
                    </span>
                    <span>
                      {isArabic ? "التغيير:" : "Change:"}{" "}
                      <span className={`font-bold ${order.changeAmount >= 0 ? "text-success-dark" : "text-danger"}`}>
                        {order.changeAmount >= 0 ? "+" : ""}{fmt(order.changeAmount)}
                      </span>
                    </span>
                    <span>
                      {isArabic ? "الجديد:" : "New:"}{" "}
                      <span className="font-bold text-gold">{fmt(order.newAmount)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setDetailOrder(order); setShowDetailModal(true); }}
                    className="p-2 text-info hover:text-info-dark transition rounded-lg hover:bg-info/10"
                    title={isArabic ? "عرض التفاصيل" : "View Details"}
                  >
                    <Eye size={16} />
                  </button>
                  {order.status === "draft" && (
                    <button
                      onClick={() => handleApprove(order)}
                      className="p-2 text-success-dark hover:text-success transition rounded-lg hover:bg-success/10"
                      title={isArabic ? "اعتماد" : "Approve"}
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {order.status === "draft" && (
                    <button
                      onClick={() => { setRejectTarget(order); setRejectReason(""); setShowRejectModal(true); }}
                      className="p-2 text-warning hover:text-warning-dark transition rounded-lg hover:bg-warning/10"
                      title={isArabic ? "رفض" : "Reject"}
                    >
                      <AlertTriangle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(order)}
                    className="p-2 text-danger hover:text-danger-dark transition rounded-lg hover:bg-danger/10"
                    title={isArabic ? "حذف" : "Delete"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" suppressHydrationWarning>
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "أمر تغيير جديد" : "New Change Order"}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "العنوان" : "Title"} *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                  placeholder={isArabic ? "عنوان أمر التغيير" : "Change order title"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الوصف" : "Description"}
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
                  placeholder={isArabic ? "وصف التغيير" : "Description of change"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "سبب التغيير" : "Reason"}
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
                  placeholder={isArabic ? "سبب التغيير" : "Reason for change"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "مبلغ التغيير" : "Change Amount"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.changeAmount}
                  onChange={(e) => setCreateForm({ ...createForm, changeAmount: e.target.value })}
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {creating
                    ? isArabic ? "جاري الإنشاء..." : "Creating..."
                    : isArabic ? "إنشاء" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" suppressHydrationWarning>
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تفاصيل أمر التغيير" : "Change Order Details"} #{detailOrder.changeNumber}
              </h2>
              <button onClick={() => { setShowDetailModal(false); setDetailOrder(null); }} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-primary">{detailOrder.title}</h3>
                <StatusBadge status={detailOrder.status} isArabic={isArabic} />
              </div>

              {detailOrder.description && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase">{isArabic ? "الوصف" : "Description"}</p>
                  <p className="text-sm text-text-primary mt-1">{detailOrder.description}</p>
                </div>
              )}

              {detailOrder.reason && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase">{isArabic ? "السبب" : "Reason"}</p>
                  <p className="text-sm text-text-primary mt-1">{detailOrder.reason}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-surface-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-text-muted">{isArabic ? "المبلغ الأصلي" : "Original"}</p>
                  <p className="text-lg font-bold text-text-primary mt-1">{fmt(detailOrder.originalAmount)}</p>
                </div>
                <div className="bg-surface-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-text-muted">{isArabic ? "مبلغ التغيير" : "Change"}</p>
                  <p className={`text-lg font-bold mt-1 ${detailOrder.changeAmount >= 0 ? "text-success-dark" : "text-danger"}`}>
                    {detailOrder.changeAmount >= 0 ? "+" : ""}{fmt(detailOrder.changeAmount)}
                  </p>
                </div>
                <div className="bg-surface-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-text-muted">{isArabic ? "المبلغ الجديد" : "New"}</p>
                  <p className="text-lg font-bold text-gold mt-1">{fmt(detailOrder.newAmount)}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4 space-y-2 text-sm">
                {detailOrder.requestedBy && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "طلب بواسطة" : "Requested by"}</span>
                    <span className="text-text-primary font-medium">{detailOrder.requestedBy}</span>
                  </div>
                )}
                {detailOrder.requestedAt && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "تاريخ الطلب" : "Requested at"}</span>
                    <span className="text-text-primary font-medium">{new Date(detailOrder.requestedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
                  </div>
                )}
                {detailOrder.approvedBy && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "اعتمد بواسطة" : "Approved by"}</span>
                    <span className="text-text-primary font-medium">{detailOrder.approvedBy}</span>
                  </div>
                )}
                {detailOrder.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "تاريخ الاعتماد" : "Approved at"}</span>
                    <span className="text-text-primary font-medium">{new Date(detailOrder.approvedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
                  </div>
                )}
                {detailOrder.rejectionReason && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "سبب الرفض" : "Rejection reason"}</span>
                    <span className="text-danger font-medium">{detailOrder.rejectionReason}</span>
                  </div>
                )}
                {detailOrder.rejectedAt && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{isArabic ? "تاريخ الرفض" : "Rejected at"}</span>
                    <span className="text-text-primary font-medium">{new Date(detailOrder.rejectedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md" suppressHydrationWarning>
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-danger">
                {isArabic ? "رفض أمر التغيير" : "Reject Change Order"}
              </h2>
              <button onClick={() => { setShowRejectModal(false); setRejectTarget(null); }} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-text-secondary">
                {isArabic ? "أنت على وشك رفض أمر التغيير:" : "You are about to reject change order:"}{" "}
                <span className="font-bold text-primary">#{rejectTarget.changeNumber} {rejectTarget.title}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "سبب الرفض" : "Rejection Reason"} *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
                  placeholder={isArabic ? "أدخل سبب الرفض" : "Enter rejection reason"}
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark transition disabled:opacity-50"
                >
                  {rejecting
                    ? isArabic ? "جاري الرفض..." : "Rejecting..."
                    : isArabic ? "رفض" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md" suppressHydrationWarning>
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-danger">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
              <button onClick={() => setDeleteTarget(null)} className="text-text-muted hover:text-text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-text-secondary">
                {isArabic
                  ? `هل أنت متأكد من حذف أمر التغيير #${deleteTarget.changeNumber} "${deleteTarget.title}"؟`
                  : `Are you sure you want to delete change order #${deleteTarget.changeNumber} "${deleteTarget.title}"?`}
              </p>
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark transition disabled:opacity-50"
                >
                  {deleting
                    ? isArabic ? "جاري الحذف..." : "Deleting..."
                    : isArabic ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
