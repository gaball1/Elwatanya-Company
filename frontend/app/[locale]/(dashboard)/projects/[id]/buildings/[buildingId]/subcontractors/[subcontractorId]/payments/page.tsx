"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { ExternalLink, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { paymentService, type Payment } from "@/services/payment.service";

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
  const [busy, setBusy] = useState(false);

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
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

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
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const approvePayment = async (p: Payment) => {
    setBusy(true);
    try {
      await paymentService.approve(buildingId, contractorId, p.id);
      refresh();
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
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Card className="p-4 mb-4 text-center bg-teal-50 border border-teal-200">
        <p className="text-text-secondary text-sm">
          {isArabic
            ? "إجمالي الدفعات (من المستخلصات)"
            : "Total Payments (from extracts)"}
        </p>
        <p className="text-2xl font-bold text-teal-700">
          {total.toLocaleString()} ج.م
        </p>
        <p className="text-xs text-text-muted mt-1">
          {isArabic
            ? "تُسجَّل تلقائياً عند حفظ كل مستخلص"
            : "Auto-recorded when each extract is saved"}
        </p>
      </Card>

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
    </div>
  );
}
