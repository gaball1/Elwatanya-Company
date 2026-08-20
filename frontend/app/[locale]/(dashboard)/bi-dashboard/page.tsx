/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Badge, Dialog, Select } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import DataLoader from "@/components/shared/DataLoader";
import { biService, type KpiResult, type ProjectDashboard } from "@/services/bi.service";
import { projectService } from "@/services/project.service";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Activity,
  AlertTriangle, CheckCircle, Info, RefreshCw,
} from "lucide-react";
import { formatUnitValue } from "@/lib/format";
import { shortRef } from "@/lib/formatRef";

const statusIcons: Record<string, any> = {
  good: <CheckCircle className="w-5 h-5 text-success" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning" />,
  danger: <AlertTriangle className="w-5 h-5 text-danger" />,
};

const trendIcons: Record<string, any> = {
  up: <TrendingUp className="w-4 h-4 text-success" />,
  down: <TrendingDown className="w-4 h-4 text-danger" />,
  stable: <Minus className="w-4 h-4 text-text-secondary" />,
};

const statusColors: Record<string, string> = {
  good: "border-l-success bg-success/5",
  warning: "border-l-warning bg-warning/5",
  danger: "border-l-danger bg-danger/5",
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  good: { ar: "جيد", en: "Good" },
  warning: { ar: "تحذير", en: "Warning" },
  danger: { ar: "خطر", en: "Critical" },
};

const categoryLabels: Record<string, { ar: string; en: string }> = {
  earned_value: { ar: "القيمة المكتسبة", en: "Earned Value" },
  financial: { ar: "المالية", en: "Financial" },
  performance: { ar: "الأداء", en: "Performance" },
  risk: { ar: "المخاطر", en: "Risk" },
  boq: { ar: "جدول الكميات", en: "BOQ" },
  resources: { ar: "الموارد", en: "Resources" },
};

const barColors: Record<string, string> = {
  good: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export default function BiDashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<KpiResult | null>(null);

  useEffect(() => {
    Promise.all([
      projectService.getProjects().catch(() => []),
      biService.evaluateAll().catch(() => []),
    ]).then(([proj, kpis]) => {
      setProjects(Array.isArray(proj) ? proj : []);
      setDashboard({
        projectId: "all",
        projectName: isArabic ? "جميع المشاريع" : "All Projects",
        kpis: kpis as KpiResult[],
        summary: {
          overallScore: 0,
          totalKpis: (kpis as KpiResult[]).length,
          goodCount: (kpis as KpiResult[]).filter((k) => k.status === "good").length,
          warningCount: (kpis as KpiResult[]).filter((k) => k.status === "warning").length,
          dangerCount: (kpis as KpiResult[]).filter((k) => k.status === "danger").length,
        },
      });
    }).finally(() => setLoading(false));
  }, []);

  const loadProjectDashboard = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await biService.getDashboard(projectId);
      setDashboard(data);
    } catch {
      showToast(isArabic ? "فشل تحميل لوحة المؤشرات" : "Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const kpiCard = (kpi: KpiResult, index: number) => {
    const { text, unit } = formatUnitValue(kpi.value, kpi.unit, isArabic ? "ar" : "en-US");
    const targetText = formatUnitValue(kpi.target, kpi.unit, isArabic ? "ar" : "en-US").text;
    return (
    <Card key={kpi.key || index}
      className={`p-4 border-l-4 cursor-pointer hover:shadow-md transition-all ${statusColors[kpi.status] || ""}`}
      onClick={() => setSelectedKpi(kpi)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcons[kpi.status] || <Info className="w-5 h-5" />}
          <h3 className="font-medium text-text-primary text-sm">{isArabic ? (kpi.nameArabic || kpi.name) : kpi.name}</h3>
        </div>
        {trendIcons[kpi.trend]}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">{text}</span>
        <span className="text-sm text-text-secondary">{unit}</span>
        <span className="text-xs text-text-secondary ml-auto">
          {isArabic ? "الهدف" : "Target"}: {targetText}
        </span>
      </div>
      <div className="mt-2 h-2 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColors[kpi.status]} `}
          style={{ width: `${Math.min(kpi.percentage, 100)}%` }} />
      </div>
    </Card>
  );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isArabic ? "لوحة مؤشرات الأداء" : "KPI Dashboard"}
          </h1>
          <p className="text-text-secondary text-sm">
            {isArabic ? "مؤشرات الأداء الرئيسية للمشاريع" : "Key Performance Indicators"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              if (e.target.value) loadProjectDashboard(e.target.value);
            }}
            className="h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold outline-none"
          >
            <option value="">{isArabic ? "كل المشاريع" : "All Projects"}</option>
            {(Array.isArray(projects) ? projects : []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name || p.code || shortRef(p.id)}</option>
            ))}
          </select>
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => selectedProject ? loadProjectDashboard(selectedProject) : window.location.reload()}>
            {isArabic ? "تحديث" : "Refresh"}
          </Button>
        </div>
      </div>

      {dashboard?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-text-primary">{dashboard.summary.totalKpis}</p>
            <p className="text-sm text-text-secondary">{isArabic ? "إجمالي المؤشرات" : "Total KPIs"}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{dashboard.summary.goodCount}</p>
            <p className="text-sm text-text-secondary">{isArabic ? "جيد" : "Good"}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-warning">{dashboard.summary.warningCount}</p>
            <p className="text-sm text-text-secondary">{isArabic ? "تحذير" : "Warning"}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-danger">{dashboard.summary.dangerCount}</p>
            <p className="text-sm text-text-secondary">{isArabic ? "حرج" : "Critical"}</p>
          </Card>
        </div>
      )}

      {loading ? (
        <DataLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard?.kpis?.map((kpi, i) => kpiCard(kpi, i))}
          {(!dashboard?.kpis || dashboard.kpis.length === 0) && (
            <Card className="p-8 col-span-full text-center">
              <Activity className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">
                {isArabic ? "لا توجد مؤشرات أداء متاحة" : "No KPIs available"}
              </p>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={!!selectedKpi}
        onClose={() => setSelectedKpi(null)}
        title={isArabic ? (selectedKpi?.nameArabic || selectedKpi?.name || "") : (selectedKpi?.name || "")}
        size="sm"
      >
        {selectedKpi && (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">{selectedKpi.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface rounded-lg text-center">
                <p className="text-sm text-text-secondary">{isArabic ? "القيمة" : "Value"}</p>
                <p className="text-xl font-bold">{formatUnitValue(selectedKpi.value, selectedKpi.unit, isArabic ? "ar" : "en-US").text} {formatUnitValue(selectedKpi.value, selectedKpi.unit, isArabic ? "ar" : "en-US").unit}</p>
              </div>
              <div className="p-3 bg-surface rounded-lg text-center">
                <p className="text-sm text-text-secondary">{isArabic ? "الهدف" : "Target"}</p>
                <p className="text-xl font-bold">{formatUnitValue(selectedKpi.target, selectedKpi.unit, isArabic ? "ar" : "en-US").text} {formatUnitValue(selectedKpi.target, selectedKpi.unit, isArabic ? "ar" : "en-US").unit}</p>
              </div>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-text-secondary">{isArabic ? "الإنجاز" : "Achievement"}</span>
                <span className="text-sm font-medium">{selectedKpi.percentage.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColors[selectedKpi.status]}`}
                  style={{ width: `${Math.min(selectedKpi.percentage, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="text-sm text-text-secondary">{isArabic ? "الحالة" : "Status"}</span>
              <Badge variant={selectedKpi.status === "good" ? "success" : selectedKpi.status === "warning" ? "warning" : "danger"}>
                {isArabic ? (statusLabels[selectedKpi.status]?.ar || selectedKpi.status) : (statusLabels[selectedKpi.status]?.en || selectedKpi.status)}
              </Badge>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
