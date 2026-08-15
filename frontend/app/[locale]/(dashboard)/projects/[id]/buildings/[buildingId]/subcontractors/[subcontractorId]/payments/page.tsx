"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { ExternalLink, Pencil, Trash2, CheckCircle2, Plus, X } from "lucide-react";
import { paymentService, type Payment, type CreatePaymentData } from "@/services/payment.service";
import { useToast } from "@/components/ui/Toast";

function getErrorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: unknown }).message)
    : "";
}

export default function ContractorPaymentsPage() {
  const params = useParams();
  const isArabic = (params.locale as string) === "ar";
  const locale = (params.locale as string) ?? "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const refresh = () => {
    paymentService
      .list(buildingId, contractorId)
      .then((p) => setPayments(p))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, contractorId]);

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const approvedTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + p.amount, 0);
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

  const openAddModal = () => {
    setNewAmount("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setNewNotes("");
    setShowAddModal(true);
  };

  const saveAdd = async () => {
    const amount = Number(newAmount);
    if (!amount || amount <= 0) {
      return;
    }
    setBusy(true);
    try {
      const payload: CreatePaymentData = {
        amount,
        date: newDate,
        notes: newNotes || undefined,
      };
      await paymentService.create(buildingId, contractorId, payload);
      setShowAddModal(false);
      showToast(isArabic ? "تم إضافة الدفعة" : "Payment added", "success");
      refresh();
    } catch (error: unknown) {
      showToast(getErrorMessage(error) || (isArabic ? "فشل إضافة الدفعة" : "Failed to add payment"), "error");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: Payment) => {
    setEditingId(p.id);
    setEditAmount(String(p.amount));
    setEditNotes(p.notes ?? "");
  };

  const saveEdit = async (p: Payment) => {
    setBusy(true);
    try {
      await paymentService.update(buildingId, contractorId, p.id, {
        amount: Number(editAmount),
        notes: editNotes,
      });
      setEditingId(null);
      showToast(isArabic ? "تم تعديل الدفعة" : "Payment updated", "success");
      refresh();
    } catch (error: unknown) {
      showToast(getErrorMessage(error) || (isArabic ? "فشل تعديل الدفعة" : "Failed to update payment"), "error");
    } finally {
      setBusy(false);
    }
  };

  const approvePayment = async (p: Payment) => {
    setBusy(true);
    try {
      await paymentService.approve(buildingId, contractorId, p.id);
      showToast(isArabic ? "تم اعتماد الدفعة" : "Payment approved", "success");
      refresh();
    } catch (error: unknown) {
      showToast(getErrorMessage(error) || (isArabic ? "فشل اعتماد الدفعة" : "Failed to approve payment"), "error");
    } finally {
      setBusy(false);
    }
  };

  const deletePayment = async (p: Payment) => {
    if (!confirm(isArabic ? "هل أنت متأكد من حذف هذه الدفعة؟" : "Delete this payment?")) {
      return;
    }
    setBusy(true);
    try {
      await paymentService.remove(buildingId, contractorId, p.id);
      showToast(isArabic ? "تم حذف الدفعة" : "Payment deleted", "success");
      refresh();
    } catch (error: unknown) {
      showToast(getErrorMessage(error) || (isArabic ? "فشل حذف الدفعة" : "Failed to delete payment"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {ToastComponent}
      <div className="flex items-start justify-between gap-4 mb-4">
        <Card className="flex-1 p-4 bg-teal-50 border border-teal-200">
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي الدفعات" : "Total Payments"}
          </p>
          <p className="text-2xl font-bold text-teal-700">
            {total.toLocaleString()} ج.م
          </p>
          <p className="text-xs text-text-muted mt-1">
            {isArabic ? "إجمالي الدفعات المسجّلة للمقاول" : "Total payments recorded for the contractor"}
          </p>
        </Card>
        <Card className="flex-1 p-4 bg-emerald-50 border border-emerald-200">
          <p className="text-text-secondary text-sm">
            {isArabic ? "الدفعات المعتمدة (المصروفة فعلاً)" : "Approved Payments (actual)"}
          </p>
          <p className="text-2xl font-bold text-emerald-700">
            {approvedTotal.toLocaleString()} ج.م
          </p>
          <p className="text-xs text-text-muted mt-1">
            {isArabic ? "هذه الدفعات تُحسب ضمن \u0022ما سبق صرفه\u0022 في المستخلصات" : "These count toward \u0022previously paid\u0022 in extracts"}
          </p>
        </Card>
        <Button onClick={openAddModal} className="shrink-0">
          <Plus size={16} className="mr-2" />
          {isArabic ? "إضافة دفعة" : "Add Payment"}
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-text-muted">
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </Card>
      ) : payments.length === 0 ? (
        <Card className="p-6 text-center text-text-secondary">
          {isArabic ? "لا توجد دفعات بعد" : "No payments yet"}
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="p-3 flex justify-between items-center">
              {editingId === p.id ? (
                <div className="flex flex-1 items-center gap-2 flex-wrap">
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-32"
                  />
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={isArabic ? "ملاحظات" : "Notes"}
                    className="flex-1 min-w-40"
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => saveEdit(p)}
                  >
                    {isArabic ? "حفظ" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.date}</p>
                      {p.status === "approved" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {isArabic ? "معتمدة" : "Approved"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{p.notes}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-primary">
                      {p.amount.toLocaleString()} ج.م
                    </p>
                    {p.extractId && (
                      <Link
                        href={`${base}/${p.extractId}`}
                        className="text-gold hover:underline flex items-center gap-1 text-xs"
                      >
                        <ExternalLink size={14} />
                        {isArabic ? "المستخلص" : "Extract"}
                      </Link>
                    )}
                    {p.status !== "approved" && (
                      <button
                        title={isArabic ? "اعتماد" : "Approve"}
                        onClick={() => approvePayment(p)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button
                      title={isArabic ? "تعديل" : "Edit"}
                      onClick={() => startEdit(p)}
                      className="text-gold hover:text-gold-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      title={isArabic ? "حذف" : "Delete"}
                      onClick={() => deletePayment(p)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">
                {isArabic ? "إضافة دفعة" : "Add Payment"}
              </h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} className="text-text-muted" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المبلغ (ج.م)" : "Amount (EGP)"}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder={isArabic ? "المبلغ" : "Amount"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "التاريخ" : "Date"}
                </label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "ملاحظات" : "Notes"}
                </label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={isArabic ? "ملاحظات اختيارية" : "Optional notes"}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                  disabled={busy}
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </Button>
                <Button className="flex-1" onClick={saveAdd} disabled={busy}>
                  {isArabic ? "حفظ" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


