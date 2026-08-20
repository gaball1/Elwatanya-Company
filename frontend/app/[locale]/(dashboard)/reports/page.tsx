/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Badge, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import { reportsService, type ReportDefinition } from "@/services/reports.service";
import { projectService, type Project } from "@/services/project.service";
import { BarChart3, FileText, Download, Eye, FileDown } from "lucide-react";

const REPORT_LOCALE: Record<string, { ar: string; arDesc: string }> = {
  project_dashboard: { ar: "لوحة تحكم المشروع", arDesc: "مؤشرات أداء المشروع الرئيسية: القيمة المكتسبة، المالية، الأداء، والمخاطر" },
  project_list: { ar: "قائمة المشاريع", arDesc: "جميع المشاريع مع الحالة والتقدم والموقع" },
  purchases_list: { ar: "قائمة المشتريات", arDesc: "أوامر الشراء بالعناصر والكمية والسعر وحالة الاعتماد" },
  project_funds: { ar: "عهد المشاريع", arDesc: "أرصدة صندوق العهد لكل مشروع: الرصيد الأولي والراهن" },
  project_analytics: { ar: "تحليلات المشروع", arDesc: "تحليلات شاملة: مؤشرات الأداء، التكلفة، جدول الكميات، أداء المقاولين، والعهد" },
  enterprise_attendance: { ar: "تقرير الحضور والانصراف", arDesc: "نسب الحضور والغياب والتأخر، ساعات العمل، العملاء النشطين، والمؤشرات اليومية حسب المبنى والقسم" },
};

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  projects: { ar: "المشاريع", en: "Projects" },
  financial: { ar: "المالية", en: "Financial" },
  employees: { ar: "الموظفين", en: "Employees" },
  inventory: { ar: "المخزون", en: "Inventory" },
  treasury: { ar: "الخزينة", en: "Treasury" },
  bi: { ar: "لوحة تحكم", en: "BI" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  analytics: { ar: "التحليلات", en: "Analytics" },
  hr: { ar: "الموارد البشرية", en: "HR" },
};

export default function ReportsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    projectService.getProjects()
      .then((list) => { setProjects(list); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    reportsService.getAvailableReports()
      .then(setReports)
      .catch(() => showToast(isArabic ? "فشل تحميل التقارير" : "Failed to load reports", "error"))
      .finally(() => setLoading(false));
  }, []);

  const getReportName = (report: ReportDefinition) =>
    isArabic ? (REPORT_LOCALE[report.name]?.ar || report.displayName) : report.displayName;

  const getReportDesc = (report: ReportDefinition) =>
    isArabic ? (REPORT_LOCALE[report.name]?.arDesc || report.description) : report.description;

  const handleDownload = async (report: ReportDefinition, format: string) => {
    if (report.requiresProject && !selectedProjectId) {
      showToast(isArabic ? "يرجى اختيار مشروع أولاً" : "Please select a project first", "error");
      return;
    }
    setGenerating(`${report.name}_${format}`);
    try {
      const blob = await reportsService.generateReport(report.name, format, report.requiresProject ? { projectId: selectedProjectId } : {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name}.${format === 'pdf' ? 'pdf' : format === 'excel' ? 'xls' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(isArabic ? "تم التحميل" : "Downloaded", "success");
    } catch {
      showToast(isArabic ? "فشل التوليد" : "Generate failed", "error");
    } finally {
      setGenerating(null);
    }
  };

  const handlePreview = async (report: ReportDefinition) => {
    if (report.requiresProject && !selectedProjectId) {
      showToast(isArabic ? "يرجى اختيار مشروع أولاً" : "Please select a project first", "error");
      return;
    }
    setGenerating(`${report.name}_preview`);
    try {
      const html = await reportsService.previewReport(report.name, report.requiresProject ? { projectId: selectedProjectId } : {});
      setPreviewHtml(html);
      setShowPreview(true);
    } catch {
      showToast(isArabic ? "فشل المعاينة" : "Preview failed", "error");
    } finally {
      setGenerating(null);
    }
  };

  const formatIcons: Record<string, any> = {
    pdf: <FileText className="w-4 h-4" />,
    excel: <FileDown className="w-4 h-4" />,
    csv: <Download className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}
      <PageHeader
        title={isArabic ? "التقارير" : "Reports"}
        description={isArabic ? "إنشاء وتحميل تقارير النظام" : "Generate and download system reports"}
      />

      {!loading && reports.some((r) => r.requiresProject) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-text-secondary">{isArabic ? "المشروع:" : "Project:"}</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border rounded-xl text-sm bg-surface text-text-primary"
          >
            <option value="">{isArabic ? "— اختر مشروع —" : "— Select a project —"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `${p.code} — ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <DataLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card key={report.name} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gold" />
                  <div>
                    <h3 className="font-semibold text-text-primary">{getReportName(report)}</h3>
                    <p className="text-sm text-text-secondary">{getReportDesc(report)}</p>
                  </div>
                </div>
                <Badge variant="info" size="sm">
                  {isArabic
                    ? (CATEGORY_LABELS[report.category]?.ar || report.category)
                    : (CATEGORY_LABELS[report.category]?.en || report.category)}
                </Badge>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />}
                  onClick={() => handlePreview(report)}
                  loading={generating === `${report.name}_preview`}>
                  {isArabic ? "معاينة" : "Preview"}
                </Button>
                {report.supportedFormats.map((fmt) => (
                  <Button key={fmt} variant="primary" size="sm" icon={formatIcons[fmt]}
                    onClick={() => handleDownload(report, fmt)}
                    loading={generating === `${report.name}_${fmt}`}>
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} title={isArabic ? "معاينة التقرير" : "Report Preview"} size="full">
        <div className="border rounded-lg p-4 bg-white max-h-[70vh] overflow-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </Dialog>
    </div>
  );
}
