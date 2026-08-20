/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Badge, PageHeader, EmptyState, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import SignaturePad from "@/components/signature/SignaturePad";
import DataLoader from "@/components/shared/DataLoader";
import { signatureWorkflowService } from "@/services/signature-workflow.service";
import { shortRef } from "@/lib/formatRef";
import { Pen, CheckCircle, XCircle, FileText, Clock } from "lucide-react";

interface PendingSignature {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStep: number;
  requestedBy: string;
  requestedAt: string;
  actions: any[];
}

export default function PendingSignaturesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [pending, setPending] = useState<PendingSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingSignature | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    signatureWorkflowService.getPending()
      .then(setPending)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openSignDialog = (item: PendingSignature) => {
    setSelected(item);
    setSignatureDataUrl("");
    setShowSignDialog(true);
  };

  const handleSign = async (status: "signed" | "rejected") => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await signatureWorkflowService.sign(selected.id, status, "", signatureDataUrl);
      setPending((prev) => prev.filter((p) => p.id !== selected.id));
      setShowSignDialog(false);
      showToast(
        status === "signed"
          ? (isArabic ? "تم التوقيع بنجاح" : "Signed successfully")
          : (isArabic ? "تم الرفض" : "Rejected"),
        status === "signed" ? "success" : "warning",
      );
    } catch {
      showToast(isArabic ? "فشل" : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const entityLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase_order: isArabic ? "أمر شراء" : "Purchase Order",
      extract: isArabic ? "خلاصة" : "Extract",
      payment: isArabic ? "دفعة" : "Payment",
      invoice: isArabic ? "فاتورة" : "Invoice",
    };
    return labels[type] || type;
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "warning" | "info" | "success" | "danger"> = {
      pending: "warning",
      in_progress: "info",
      completed: "success",
      rejected: "danger",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}
      <PageHeader
        title={isArabic ? "انتظار التوقيع" : "Pending Signatures"}
        description={isArabic ? "المستندات التي تنتظر توقيعك" : "Documents awaiting your signature"}
      />

      {loading ? (
        <DataLoader />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12" />}
          title={isArabic ? "لا توجد طلبات معلقة" : "No pending requests"}
          description={isArabic ? "جميع المستندات مكتملة" : "All documents are completed"}
        />
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-gold" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{entityLabel(item.entityType)}</span>
                      {statusBadge(item.status)}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {isArabic ? "برقم" : "Ref"}: {shortRef(item.entityId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.requestedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}
                  </span>
                  <Button size="sm" icon={<Pen className="w-4 h-4" />} onClick={() => openSignDialog(item)}>
                    {isArabic ? "توقيع" : "Sign"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showSignDialog}
        onClose={() => setShowSignDialog(false)}
        title={isArabic ? "توقيع المستند" : "Sign Document"}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            {isArabic ? "ارسم توقيعك أو استخدم التوقيع المحفوظ" : "Draw your signature or use saved one"}
          </p>
          <SignaturePad
            onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
            width={400}
            height={150}
          />
          {signatureDataUrl && (
            <div className="border rounded p-2 bg-white">
              <img src={signatureDataUrl} alt="Signature" className="max-h-16" />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="danger"
              onClick={() => handleSign("rejected")}
              loading={submitting}
              icon={<XCircle className="w-4 h-4" />}
            >
              {isArabic ? "رفض" : "Reject"}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSign("signed")}
              loading={submitting}
              icon={<CheckCircle className="w-4 h-4" />}
              disabled={!signatureDataUrl}
            >
              {isArabic ? "توقيع" : "Sign"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
