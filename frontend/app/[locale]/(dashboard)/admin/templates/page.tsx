/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input, Dialog, Badge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui";
import { documentEngineService, type DocumentTemplate } from "@/services/document-engine.service";
import { FileText, Plus, Pencil, Trash2, Eye, FileDown } from "lucide-react";

export default function TemplatesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string>("");
  const [form, setForm] = useState({ name: "", description: "", category: "general", content: "", variables: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await documentEngineService.getTemplates();
      setTemplates(data);
    } catch {
      showToast(isArabic ? "فشل تحميل القوالب" : "Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      let variables: any[] = [];
      try { variables = form.variables ? JSON.parse(form.variables) : []; } catch {}
      await documentEngineService.createTemplate({
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        content: form.content,
        variables,
      });
      setShowCreate(false);
      setForm({ name: "", description: "", category: "general", content: "", variables: "" });
      showToast(isArabic ? "تم إنشاء القالب" : "Template created", "success");
      loadTemplates();
    } catch {
      showToast(isArabic ? "فشل الإنشاء" : "Create failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentEngineService.deleteTemplate(id);
      showToast(isArabic ? "تم الحذف" : "Deleted", "success");
      loadTemplates();
    } catch {
      showToast(isArabic ? "فشل الحذف" : "Delete failed", "error");
    }
  };

  const handlePreview = async (template: DocumentTemplate) => {
    setShowPreview(template.id);
    try {
      const result = await documentEngineService.renderTemplate(template.id, {});
      setPreviewResult(result.rendered);
    } catch {
      setPreviewResult(isArabic ? "فشل المعاينة" : "Preview failed");
    }
  };

  const categoryColors: Record<string, "default" | "success" | "info" | "warning" | "gold"> = {
    general: "default",
    contract: "success",
    report: "info",
    invoice: "warning",
    letter: "gold",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}
      <PageHeader
        title={isArabic ? "قوالب المستندات" : "Document Templates"}
        description={isArabic ? "إنشاء وإدارة قوالب المستندات" : "Create and manage document templates"}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            {isArabic ? "قالب جديد" : "New Template"}
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4"><div className="h-32 bg-surface rounded animate-pulse" /></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState icon={<FileText className="w-12 h-12" />}
          title={isArabic ? "لا توجد قوالب" : "No templates"}
          description={isArabic ? "أنشئ أول قالب مستند" : "Create your first document template"}
          action={{ label: isArabic ? "قالب جديد" : "New Template", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" />
                  <h3 className="font-semibold text-text-primary">{t.name}</h3>
                </div>
                <Badge variant={categoryColors[t.category] || "default"} size="sm">{t.category}</Badge>
              </div>
              {t.description && <p className="text-sm text-text-secondary mb-2 line-clamp-2">{t.description}</p>}
              <div className="text-xs text-text-secondary mb-3">
                v{t.version} &middot; {new Date(t.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => handlePreview(t)}>
                  {isArabic ? "معاينة" : "Preview"}
                </Button>
                <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(t.id)}>
                  {isArabic ? "حذف" : "Delete"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title={isArabic ? "قالب جديد" : "New Template"} size="lg">
        <div className="space-y-4">
          <Input label={isArabic ? "الاسم" : "Name"} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label={isArabic ? "الوصف" : "Description"} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{isArabic ? "التصنيف" : "Category"}</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none">
              <option value="general">{isArabic ? "عام" : "General"}</option>
              <option value="contract">{isArabic ? "عقد" : "Contract"}</option>
              <option value="report">{isArabic ? "تقرير" : "Report"}</option>
              <option value="invoice">{isArabic ? "فاتورة" : "Invoice"}</option>
              <option value="letter">{isArabic ? "خطاب" : "Letter"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{isArabic ? "المحتوى" : "Content"} <span className="text-xs">(استخدم {'{{variable}}'} للمتغيرات)</span></label>
            <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full h-40 p-3 rounded-lg bg-surface border border-border text-text-primary font-mono text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none resize-y"
              placeholder={`<h1>{{title}}</h1>\n<p>Date: {{date}}</p>\n<p>{{body}}</p>`} />
          </div>
          <Input label={isArabic ? "المتغيرات (JSON)" : "Variables (JSON)"} value={form.variables} onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
            placeholder='[{"key": "title", "label": "Title"}, {"key": "date", "label": "Date"}]' />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>{isArabic ? "إنشاء" : "Create"}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!showPreview} onClose={() => { setShowPreview(null); setPreviewResult(""); }} title={isArabic ? "معاينة القالب" : "Template Preview"} size="lg">
        <div className="border rounded-lg p-4 bg-white max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: previewResult }} />
      </Dialog>
    </div>
  );
}
