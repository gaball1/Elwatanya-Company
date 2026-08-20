/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Badge, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import DataLoader from "@/components/shared/DataLoader";
import { analyticsService, type ExecutiveDashboard, type ProjectAnalytics } from "@/services/analytics.service";
import { DonutChart, ProgressBar, HorizontalBars } from "@/components/analytics/charts";
import {
  Building2, Users, Activity, AlertTriangle, Wallet, Boxes, RefreshCw,
  TrendingUp, TrendingDown, ChevronRight, Files,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

function currency(n: number): string {
  return formatCurrency(n);
}

export default function ExecutiveDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const { showToast, ToastComponent } = useToast();

  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await analyticsService.getExecutive());
    } catch {
      showToast(t("Failed to load executive dashboard", "فشل تحميل لوحة الإدارة"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openProject = async (projectId: string) => {
    try {
      const d = await analyticsService.getDashboard(projectId);
      setSelectedProject(d);
    } catch {
      showToast(t("Failed to load project", "فشل تحميل المشروع"), "error");
    }
  };

  const riskLevel = (score: number): string => (score >= 50 ? "high" : score >= 25 ? "medium" : "low");

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("Executive Dashboard", "لوحة الإدارة التنفيذية")}
          </h1>
          <p className="text-text-secondary text-sm">
            {t("Company-wide construction analytics across all projects", "تحليلات البناء على مستوى الشركة لجميع المشاريع")}
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
          {t("Refresh", "تحديث")}
        </Button>
      </div>

      {loading ? (
        <DataLoader />
      ) : !data ? (
        <Card className="p-12 text-center">
          <Activity className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">{t("No analytics data available", "لا توجد بيانات تحليلات متاحة")}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-gold" /></div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{data.company.projectCount}</p>
                  <p className="text-xs text-text-secondary">{t("Projects", "المشاريع")}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-gold" /></div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{data.company.buildingCount}</p>
                  <p className="text-xs text-text-secondary">{t("Buildings", "المباني")}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Users className="w-5 h-5 text-gold" /></div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{data.company.employeeCount}</p>
                  <p className="text-xs text-text-secondary">{t("Employees", "الموظفون")}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Files className="w-5 h-5 text-gold" /></div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{data.company.pendingApprovals}</p>
                  <p className="text-xs text-text-secondary">{t("Pending approvals", "الموافقات المعلقة")}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Financial Totals", "الإجماليات المالية")}</h3>
              <div className="space-y-3">
                {[
                  { label: t("Revenue", "الإيرادات"), value: data.totals.revenue, cls: "text-text-primary" },
                  { label: t("Cost", "التكلفة"), value: data.totals.cost, cls: "text-text-secondary" },
                  { label: t("Profit", "الربح"), value: data.totals.profit, cls: data.totals.profit >= 0 ? "text-success" : "text-danger" },
                  { label: t("Cash Balance", "الرصيد النقدي"), value: data.totals.cashBalance, cls: data.totals.cashBalance >= 0 ? "text-text-primary" : "text-danger" },
                  { label: t("Inventory Value", "قيمة المخزون"), value: data.totals.inventoryValue, cls: "text-text-primary" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <span className="text-sm text-text-secondary">{m.label}</span>
                    <span className={`text-base font-bold ${m.cls}`}>{currency(m.value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>{t("Overall Margin", "الهامش الإجمالي")}</span>
                  <span className={data.totals.margin >= 15 ? "text-success" : data.totals.margin >= 5 ? "text-warning" : "text-danger"}>{data.totals.margin.toFixed(1)}%</span>
                </div>
                <ProgressBar value={data.totals.margin} max={50} color={data.totals.margin >= 15 ? "var(--color-success)" : data.totals.margin >= 5 ? "var(--color-gold)" : "var(--color-danger)"} />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Company Averages", "متوسطات الشركة")}</h3>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <DonutChart value={data.averages.progress} label={`${data.averages.progress.toFixed(0)}%`}
                    sublabel={t("Progress", "الإنجاز")} color="var(--color-gold)" size={110} />
                </div>
                <div className="text-center">
                  <DonutChart value={data.averages.riskScore} label={`${data.averages.riskScore.toFixed(0)}`}
                    sublabel={t("Risk", "المخاطر")} color={data.averages.riskScore >= 50 ? "var(--color-danger)" : data.averages.riskScore >= 25 ? "var(--color-gold)" : "var(--color-success)"} size={110} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5 text-center">
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xl font-bold text-text-primary">{data.company.attendanceToday}</p>
                  <p className="text-[10px] text-text-secondary">{t("Attended today", "الحضور اليوم")}</p>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xl font-bold text-warning">{data.company.lateToday}</p>
                  <p className="text-[10px] text-text-secondary">{t("Late today", "المتأخرون اليوم")}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Portfolio Overview", "نظرة على المحفظة")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t("Profit by Project", "الربح حسب المشروع"), value: data.projects.reduce((a, p) => a + p.profit, 0), good: true },
                  { label: t("Avg Progress", "متوسط الإنجاز"), value: data.averages.progress, suffix: "%", good: data.averages.progress > 50 },
                  { label: t("Avg Risk", "متوسط المخاطر"), value: data.averages.riskScore, good: data.averages.riskScore < 50 },
                  { label: t("Active Projects", "مشاريع نشطة"), value: data.projects.length, good: true },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className={`text-base font-bold ${m.good ? "text-text-primary" : "text-warning"}`}>{typeof m.value === "number" ? `${m.value.toFixed(1)}${m.suffix || ""}` : m.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-text-primary mb-4">{t("Projects Comparison", "مقارنة المشاريع")}</h3>
            <HorizontalBars currency="" data={data.projects.map((p) => ({ label: p.code || p.name, value: p.profit, color: p.profit >= 0 ? "var(--color-success)" : "var(--color-danger)" }))} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map((p) => (
              <Card key={p.id} className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => openProject(p.id)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">{p.name}</p>
                    <p className="text-xs text-text-secondary">{p.code}</p>
                  </div>
                  <Badge variant={p.status === "active" ? "success" : p.status === "completed" ? "info" : "default"}>{p.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-2 bg-surface rounded-lg">
                    <p className={`text-sm font-bold ${p.profit >= 0 ? "text-success" : "text-danger"}`}>{currency(p.profit)}</p>
                    <p className="text-[10px] text-text-secondary">{t("Profit", "الربح")}</p>
                  </div>
                  <div className="p-2 bg-surface rounded-lg">
                    <p className="text-sm font-bold text-text-primary">{p.progress.toFixed(0)}%</p>
                    <p className="text-[10px] text-text-secondary">{t("Progress", "الإنجاز")}</p>
                  </div>
                  <div className="p-2 bg-surface rounded-lg">
                    <p className="text-sm font-bold text-text-primary">{p.margin.toFixed(1)}%</p>
                    <p className="text-[10px] text-text-secondary">{t("Margin", "الهامش")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={riskLevel(p.riskScore) === "high" ? "danger" : riskLevel(p.riskScore) === "medium" ? "warning" : "success"}>
                    {t("Risk", "المخاطر")} {p.riskScore.toFixed(0)}
                  </Badge>
                  <span className="flex items-center text-xs text-gold">{t("Open", "فتح")} <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </Card>
            ))}
            {data.projects.length === 0 && (
              <Card className="p-8 col-span-full text-center">
                <Activity className="w-12 h-12 text-text-secondary mx-auto mb-3" />
                <p className="text-text-secondary">{t("No projects to display", "لا توجد مشاريع للعرض")}</p>
              </Card>
            )}
          </div>
        </>
      )}

      <Dialog open={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject?.project?.name || ""} size="lg">
        {selectedProject && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("Progress", "الإنجاز"), value: `${selectedProject.progress.projectPercent.toFixed(1)}%`, cls: "text-text-primary" },
                { label: "CPI", value: selectedProject.evm.cpi.toFixed(2), cls: selectedProject.evm.cpi >= 1 ? "text-success" : "text-danger" },
                { label: "SPI", value: selectedProject.evm.spi.toFixed(2), cls: selectedProject.evm.spi >= 1 ? "text-success" : "text-danger" },
                { label: t("Profit", "الربح"), value: currency(selectedProject.cost.profit), cls: selectedProject.cost.profit >= 0 ? "text-success" : "text-danger" },
              ].map((m) => (
                <div key={m.label} className="p-3 bg-surface rounded-lg">
                  <p className="text-[10px] text-text-secondary">{m.label}</p>
                  <p className={`text-sm font-bold ${m.cls}`}>{m.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProject.risks.items.slice(0, 5).map((r) => (
                <Badge key={r.code} variant={r.severity === "critical" || r.severity === "high" ? "danger" : r.severity === "medium" ? "warning" : "info"}>
                  {isArabic ? r.labelAr : r.label}
                </Badge>
              ))}
            </div>
            <Button variant="primary" onClick={() => { setSelectedProject(null); router.push(`/${locale}/analytics`); }}>
              {t("Open Project Analytics", "فتح تحليلات المشروع")}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
