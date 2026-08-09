/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input, Dialog, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui";
import { documentNumberService, type DocumentNumberConfig } from "@/services/document-number.service";
import { Hash, RotateCcw, FileText, Pencil } from "lucide-react";

const resetStrategyLabels: Record<string, { ar: string; en: string }> = {
  none: { ar: "بدون إعادة تعيين", en: "No reset" },
  yearly: { ar: "سنوي", en: "Yearly" },
  monthly: { ar: "شهري", en: "Monthly" },
  daily: { ar: "يومي", en: "Daily" },
};

const documentTypeLabels: Record<string, { ar: string; en: string }> = {
  purchase_order: { ar: "أمر شراء", en: "Purchase Order" },
  extract: { ar: "خلاصة", en: "Extract" },
  payment: { ar: "دفعة", en: "Payment" },
  invoice: { ar: "فاتورة", en: "Invoice" },
  project: { ar: "مشروع", en: "Project" },
  contract: { ar: "عقد", en: "Contract" },
  employee: { ar: "موظف", en: "Employee" },
  report: { ar: "تقرير", en: "Report" },
  fund_transaction: { ar: "معاملة صندوق", en: "Fund Transaction" },
  client_statement: { ar: "كشف عميل", en: "Client Statement" },
  subcontractor_statement: { ar: "كشف مقاول", en: "Subcontractor Statement" },
  purchase_request: { ar: "طلب شراء", en: "Purchase Request" },
};

export default function DocumentNumbersPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [configs, setConfigs] = useState<DocumentNumberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DocumentNumberConfig | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<{ prefix: string; padding: number; resetStrategy: 'none' | 'yearly' | 'monthly' | 'daily' }>({ prefix: "", padding: 5, resetStrategy: "yearly" });
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await documentNumberService.getConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      showToast(isArabic ? "فشل تحميل الإعدادات" : "Failed to load configs", "error");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (config: DocumentNumberConfig) => {
    setEditing(config);
    setEditForm({ prefix: config.prefix, padding: config.padding, resetStrategy: config.resetStrategy });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await documentNumberService.updateConfig(editing.documentType, editForm);
      setShowEditDialog(false);
      showToast(isArabic ? "تم الحفظ" : "Saved", "success");
      loadConfigs();
    } catch {
      showToast(isArabic ? "فشل الحفظ" : "Save failed", "error");
    }
  };

  const handleReset = async (config: DocumentNumberConfig) => {
    try {
      await documentNumberService.resetCounter(config.documentType);
      showToast(isArabic ? "تم إعادة التعيين" : "Counter reset", "success");
      loadConfigs();
    } catch {
      showToast(isArabic ? "فشل إعادة التعيين" : "Reset failed", "error");
    }
  };

  const handleGenerate = async (config: DocumentNumberConfig) => {
    setGenerating(config.documentType);
    try {
      const number = await documentNumberService.generate(config.documentType);
      showToast(`${isArabic ? "الرقم" : "Number"}: ${number}`, "success");
    } catch {
      showToast(isArabic ? "فشل التوليد" : "Generate failed", "error");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}
      <PageHeader
        title={isArabic ? "ترقيم المستندات" : "Document Numbers"}
        description={isArabic ? "إدارة تنسيق وترقيم المستندات" : "Manage document numbering formats"}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="h-24 bg-surface rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <Card key={config.documentType} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" />
                  <h3 className="font-semibold text-text-primary">
                    {isArabic
                      ? (documentTypeLabels[config.documentType]?.ar || config.documentType)
                      : (documentTypeLabels[config.documentType]?.en || config.documentType)}
                  </h3>
                </div>
                <Button variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(config)} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isArabic ? "التنسيق" : "Format"}:</span>
                  <code className="bg-surface px-2 py-0.5 rounded text-xs font-mono">
                    {config.prefix}
                    {config.resetStrategy !== "none" ? "-YYYY" : ""}
                    -{"N".repeat(config.padding)}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isArabic ? "الرقم التالي" : "Next"}:</span>
                  <span className="font-medium">{config.nextNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isArabic ? "إعادة التعيين" : "Reset"}:</span>
                  <Badge variant="info" size="sm">
                    {isArabic
                      ? (resetStrategyLabels[config.resetStrategy]?.ar || config.resetStrategy)
                      : (resetStrategyLabels[config.resetStrategy]?.en || config.resetStrategy)}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" icon={<Hash className="w-4 h-4" />} onClick={() => handleGenerate(config)} loading={generating === config.documentType}>
                  {isArabic ? "توليد" : "Generate"}
                </Button>
                <Button variant="ghost" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={() => handleReset(config)}>
                  {isArabic ? "إعادة" : "Reset"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} title={isArabic ? "تعديل التنسيق" : "Edit Format"} size="sm">
        <div className="space-y-4">
          <Input label={isArabic ? "البادئة" : "Prefix"} value={editForm.prefix} onChange={(e) => setEditForm((f) => ({ ...f, prefix: e.target.value }))} />
          <Input label={isArabic ? "عدد الأرقام" : "Padding"} type="number" value={String(editForm.padding)} onChange={(e) => setEditForm((f) => ({ ...f, padding: parseInt(e.target.value) || 1 }))} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{isArabic ? "إعادة التعيين" : "Reset Strategy"}</label>
            <select
              value={editForm.resetStrategy}
              onChange={(e) => setEditForm((f) => ({ ...f, resetStrategy: e.target.value as 'none' | 'yearly' | 'monthly' | 'daily' }))}
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
            >
              {Object.entries(resetStrategyLabels).map(([key, val]) => (
                <option key={key} value={key}>{isArabic ? val.ar : val.en}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button variant="primary" onClick={handleSave}>{isArabic ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
