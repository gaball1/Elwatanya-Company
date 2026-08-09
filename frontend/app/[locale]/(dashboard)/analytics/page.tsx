/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Badge, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  analyticsService,
  analyticsExport,
  type ProjectAnalytics,
  type KpiMetric,
  type DrillDownNode,
} from "@/services/analytics.service";
import { projectService } from "@/services/project.service";
import {
  DonutChart, ProgressBar, LineChart, HorizontalBars, BarChart,
} from "@/components/analytics/charts";
import KpiCard from "@/components/analytics/KpiCard";
import { formatCurrency, formatPercent, formatRatio, formatCount } from "@/lib/format";
import { shortRef } from "@/lib/formatRef";
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw,
  FileText, FileSpreadsheet, FileDown, ChevronRight, Building2, Users,
  Wallet, Package, HardHat, Boxes, Receipt,
} from "lucide-react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "gold";
const severityColors: Record<string, BadgeVariant> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
};

const classificationLabels: Record<string, string> = {
  very_profitable: "Profitable",
  profitable: "Profitable",
  break_even: "Break even",
  loss: "Loss",
  critical_loss: "Critical loss",
};

const classificationColors: Record<string, BadgeVariant> = {
  very_profitable: "success",
  profitable: "success",
  break_even: "default",
  loss: "warning",
  critical_loss: "danger",
};

function currency(n: number): string {
  return formatCurrency(n);
}

export default function AnalyticsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const t = (en: string, ar: string) => (isArabic ? ar : en);
  const { showToast, ToastComponent } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [data, setData] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [drill, setDrill] = useState<{ title: string; node: DrillDownNode } | null>(null);

  useEffect(() => {
    projectService
      .getProjects()
      .then((proj) => {
        setProjects(Array.isArray(proj) ? proj : []);
        const first = Array.isArray(proj) && proj.length > 0 ? proj[0].id : "";
        if (first) {
          setSelectedProject(first);
          analyticsService.getDashboard(first).then(setData).catch(() => {
            showToast(t("Failed to load analytics", "فشل تحميل التحليلات"), "error");
          }).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    setSelectedProject(projectId);
    setLoading(true);
    try {
      setData(await analyticsService.getDashboard(projectId));
    } catch {
      showToast(t("Failed to load analytics", "فشل تحميل التحليلات"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrill = async (kpi: KpiMetric) => {
    if (!selectedProject || !["progress", "cost", "revenue", "profit"].includes(kpi.key)) return;
    try {
      const node = await analyticsService.getDrillDown(selectedProject, kpi.key);
      setDrill({ title: kpi.labelAr && isArabic ? kpi.labelAr : kpi.label, node });
    } catch {
      showToast(t("No drill-down available", "لا توجد تفاصيل متاحة"), "error");
    }
  };

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    if (!selectedProject) return;
    setExporting(format);
    try {
      await analyticsExport[format](selectedProject);
      showToast(t("Export started", "تم بدء التصدير"), "success");
    } catch {
      showToast(t("Export failed", "فشل التصدير"), "error");
    } finally {
      setExporting(null);
    }
  };

  const kpiCard = (kpi: KpiMetric) => (
    <KpiCard
      key={kpi.key}
      kpi={kpi}
      isArabic={isArabic}
      onClick={() => handleDrill(kpi)}
    />
  );

  const riskBadge = (severity: string) => (
    <Badge variant={severityColors[severity] || "default"}>{severity}</Badge>
  );

  const drillRender = (node: DrillDownNode, depth: number) => (
    <div key={node.id} className={depth > 0 ? "ms-6 border-s border-border ps-3 py-1" : "py-1"}>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />}
          <span className="text-sm font-medium text-text-primary truncate">{node.name}</span>
        </div>
        <span className="text-sm text-text-secondary shrink-0 ms-3">{node.display}</span>
      </div>
      {node.children?.map((child) => drillRender(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("Project Analytics", "تحليلات المشروع")}
          </h1>
          <p className="text-text-secondary text-sm">
            {t("Earned value, cost breakdown, BOQ intelligence, contractors, treasury and risks",
              "القيمة المكتسبة، توزيع التكاليف، ذكاء البنود، المقاولون، الخزانة والمخاطر")}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedProject}
            onChange={(e) => e.target.value && loadProject(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold outline-none"
          >
            <option value="">{t("Select Project", "اختر المشروع")}</option>
            {(Array.isArray(projects) ? projects : []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name || p.code || shortRef(p.id)}</option>
            ))}
          </select>
          <Button variant="outline" icon={<FileText className="w-4 h-4" />} loading={exporting === "pdf"} onClick={() => handleExport("pdf")}>
            PDF
          </Button>
          <Button variant="outline" icon={<FileSpreadsheet className="w-4 h-4" />} loading={exporting === "excel"} onClick={() => handleExport("excel")}>
            Excel
          </Button>
          <Button variant="outline" icon={<FileDown className="w-4 h-4" />} loading={exporting === "csv"} onClick={() => handleExport("csv")}>
            CSV
          </Button>
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => selectedProject && loadProject(selectedProject)}>
            {t("Refresh", "تحديث")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="p-4"><div className="h-16 bg-surface rounded animate-pulse" /></Card>
            ))}
          </div>
          <Card className="p-8"><div className="h-48 bg-surface rounded animate-pulse" /></Card>
        </div>
      ) : !data ? (
        <Card className="p-12 text-center">
          <Activity className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">{t("Select a project to view analytics", "اختر مشروعاً لعرض التحليلات")}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.values(data.kpis).map(kpiCard)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Earned Value Management", "إدارة القيمة المكتسبة")}</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: t("PV", "القيمة المخططة"), value: data.evm.pv },
                  { label: t("EV", "القيمة المكتسبة"), value: data.evm.ev },
                  { label: t("AC", "التكلفة الفعلية"), value: data.evm.ac },
                ].map((m) => (
                  <div key={m.label} className="p-2 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className="text-sm font-bold text-text-primary">{currency(m.value)}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: "CPI", value: data.evm.cpi.toFixed(2), good: data.evm.cpi >= 1 },
                  { label: "SPI", value: data.evm.spi.toFixed(2), good: data.evm.spi >= 1 },
                  { label: "EAC", value: currency(data.evm.eac), good: true },
                  { label: "VAC", value: currency(data.evm.vac), good: data.evm.vac >= 0 },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{m.label}</span>
                      {m.good ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                    </div>
                    <p className="text-lg font-bold text-text-primary">{m.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Project Progress", "نسبة إنجاز المشروع")}</h3>
              <div className="flex items-center gap-6">
                <DonutChart value={data.progress.projectPercent} label={`${data.progress.projectPercent.toFixed(1)}%`}
                  sublabel={t("Executed", "المنفذ")} color="var(--color-gold)" />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>{t("Planned", "المخطط")}</span>
                      <span>{data.evm.plannedPercent.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={data.evm.plannedPercent} color="var(--color-info)" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>{t("Actual", "الفعلي")}</span>
                      <span>{data.progress.projectPercent.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={data.progress.projectPercent} color="var(--color-gold)" />
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {data.buildings.map((b) => (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-primary font-medium">{b.name}</span>
                      <span className="text-text-secondary">{b.progress.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={b.progress} color={b.progress >= 80 ? "var(--color-success)" : b.progress >= 40 ? "var(--color-gold)" : "var(--color-warning)"} />
                  </div>
                ))}
                {data.progress.categories.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-text-secondary mb-2">{t("By Category", "حسب التصنيف")}</p>
                    <div className="space-y-2">
                      {data.progress.categories.slice(0, 6).map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className="text-text-secondary truncate flex-1">{c.name}</span>
                          <span className="text-text-primary font-medium">{c.percent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Cost Breakdown", "توزيع التكاليف")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t("Employer Value", "قيمة صاحب العمل"), value: data.cost.employerValue, color: "text-text-primary" },
                  { label: t("Contractor Value", "قيمة المقاولين"), value: data.cost.contractorValue, color: "text-text-secondary" },
                  { label: t("Executed Cost", "التكلفة المنفذة"), value: data.cost.actualCost, color: "text-text-secondary" },
                  { label: t("Profit", "الربح"), value: data.cost.profit, color: data.cost.profit >= 0 ? "text-success" : "text-danger" },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className={`text-base font-bold ${m.color}`}>{currency(m.value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>{t("BOQ Margin", "هامش البنود")}</span>
                  <span className={data.cost.margin >= 15 ? "text-success" : data.cost.margin >= 5 ? "text-warning" : "text-danger"}>
                    {data.cost.margin.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={data.cost.margin} max={50} color={data.cost.margin >= 15 ? "var(--color-success)" : data.cost.margin >= 5 ? "var(--color-gold)" : "var(--color-danger)"} />
              </div>
              <div className="mt-5">
                <p className="text-xs font-medium text-text-secondary mb-2">{t("Item Classification", "تصنيف البنود")}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(Object.entries(data.boq.counts) || []).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-surface rounded-lg">
                      <Badge variant={classificationColors[key] || "default"} size="sm">{t(classificationLabels[key] || key, classificationLabels[key] || key)}</Badge>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Top Profitable Items", "أكثر البنود ربحية")}</h3>
              <HorizontalBars
                currency=""
                data={data.boq.topProfit.slice(0, 6).map((i) => ({ label: `${i.itemCode} ${i.description}`.slice(0, 28), value: i.profit }))}
              />
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-text-primary mb-4">{t("Top Loss Items", "البنود الخاسرة")}</h3>
              {data.boq.topLoss.length === 0 ? (
                <p className="text-sm text-text-secondary">{t("No loss-making items", "لا توجد بنود خاسرة")}</p>
              ) : (
                <HorizontalBars
                  currency=""
                  data={data.boq.topLoss.slice(0, 6).map((i) => ({ label: `${i.itemCode} ${i.description}`.slice(0, 28), value: -i.loss, color: "var(--color-danger)" }))}
                />
              )}
            </Card>
          </div>

          {data.contractors.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <HardHat className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Contractor Performance", "أداء المقاولين")}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-secondary border-b border-border">
                      <th className="text-start pb-2 font-medium">{t("Contractor", "المقاول")}</th>
                      <th className="text-start pb-2 font-medium">{t("Work", "العمل")}</th>
                      <th className="text-end pb-2 font-medium">{t("BOQ Value", "قيمة البنود")}</th>
                      <th className="text-end pb-2 font-medium">{t("Extracts", "المستخلصات")}</th>
                      <th className="text-end pb-2 font-medium">{t("Paid", "المدفوع")}</th>
                      <th className="text-end pb-2 font-medium">{t("Exec %", "المنفذ %")}</th>
                      <th className="text-end pb-2 font-medium">{t("Delay", "التأخير")}</th>
                      <th className="text-end pb-2 font-medium">{t("Score", "النتيجة")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contractors.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 font-medium text-text-primary">{c.name}</td>
                        <td className="py-2 text-text-secondary">{c.workType || "—"}</td>
                        <td className="py-2 text-end">{currency(c.assignedBOQ)}</td>
                        <td className="py-2 text-end">{currency(c.extractValue)}</td>
                        <td className="py-2 text-end">{currency(c.paid)}</td>
                        <td className="py-2 text-end">{c.averageExecution.toFixed(1)}%</td>
                        <td className="py-2 text-end">
                          {c.averageDelayDays > 0
                            ? <Badge variant="warning">{c.averageDelayDays} {t("d", "ي")}</Badge>
                            : <Badge variant="success">{t("On time", "في الموعد")}</Badge>}
                        </td>
                        <td className="py-2 text-end">
                          <Badge variant={c.performanceScore >= 80 ? "success" : c.performanceScore >= 60 ? "warning" : "danger"}>
                            {c.performanceScore.toFixed(0)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Treasury & Cash Flow", "الخزانة والتدفق النقدي")}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t("Cash In", "المدخلات"), value: data.treasury.cashIn, cls: "text-success" },
                  { label: t("Cash Out", "المخرجات"), value: data.treasury.cashOut, cls: "text-danger" },
                  { label: t("Balance", "الرصيد"), value: data.treasury.balance, cls: data.treasury.balance >= 0 ? "text-text-primary" : "text-danger" },
                  { label: t("Net", "الصافي"), value: data.treasury.netCashFlow, cls: data.treasury.netCashFlow >= 0 ? "text-success" : "text-danger" },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className={`text-sm font-bold ${m.cls}`}>{currency(m.value)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs text-text-secondary mb-2">{t("Committed payments", "الالتزامات المدفوعات")}: {currency(data.treasury.committedPayments)} · {t("Upcoming", "القادم")}: {currency(data.treasury.upcomingPayments)}</p>
                <LineChart
                  data={data.treasury.monthly.map((m) => ({ label: m.month.slice(5), value: m.net }))}
                  height={140}
                  color={data.treasury.monthly.every((m) => m.net >= 0) ? "var(--color-success)" : "var(--color-gold)"}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Purchases & Suppliers", "المشتريات والموردون")}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t("Budget", "الميزانية"), value: data.purchases.purchaseBudget },
                  { label: t("Actual", "الفعلي"), value: data.purchases.actualPurchases },
                  { label: t("Overrun", "التجاوز"), value: data.purchases.costOverrun },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className={`text-sm font-bold ${m.label === t("Overrun", "التجاوز") && m.value > 0 ? "text-danger" : "text-text-primary"}`}>{currency(m.value)}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                <div className="p-2 bg-surface rounded-lg"><p className="text-sm font-bold">{data.purchases.openOrders.count}</p><p className="text-[10px] text-text-secondary">{t("Open", "مفتوحة")}</p></div>
                <div className="p-2 bg-surface rounded-lg"><p className="text-sm font-bold">{data.purchases.delivered.count}</p><p className="text-[10px] text-text-secondary">{t("Delivered", "تم التسليم")}</p></div>
                <div className="p-2 bg-surface rounded-lg"><p className="text-sm font-bold text-danger">{data.purchases.delayed.count}</p><p className="text-[10px] text-text-secondary">{t("Delayed", "متأخرة")}</p></div>
              </div>
              {data.purchases.topSuppliers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">{t("Top Suppliers", "أهم الموردين")}</p>
                  <HorizontalBars currency="" data={data.purchases.topSuppliers.slice(0, 4).map((s) => ({ label: s.name, value: s.value }))} />
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Boxes className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Inventory", "المخزون")}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t("Current Stock", "الرصيد الحالي"), value: currency(data.inventory.currentStock) },
                  { label: t("Inventory Value", "قيمة المخزون"), value: currency(data.inventory.inventoryValue) },
                  { label: t("Consumption", "الاستهلاك"), value: currency(data.inventory.consumption) },
                  { label: t("Turnover", "الدوران"), value: data.inventory.turnover.toFixed(2) },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-surface rounded-lg">
                    <p className="text-[10px] text-text-secondary">{m.label}</p>
                    <p className="text-sm font-bold text-text-primary">{m.value}</p>
                  </div>
                ))}
              </div>
              {data.inventory.reorderItems.length > 0 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs font-medium text-warning mb-2">
                    {t("Reorder needed", "يلزم إعادة الطلب")}: {data.inventory.reorderItems.length}
                  </p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {data.inventory.reorderItems.slice(0, 8).map((i) => (
                      <div key={i.id} className="flex justify-between text-xs">
                        <span className="text-text-primary truncate">{i.code} · {i.name}</span>
                        <span className="text-text-secondary shrink-0">{i.quantity} / {i.minQuantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Employees & Attendance", "الموظفون والحضور")}</h3>
              </div>
              <div className="flex items-center gap-4">
                <DonutChart value={data.employees.attendanceRate} label={`${data.employees.attendanceRate.toFixed(0)}%`}
                  sublabel={t("Attendance", "الحضور")} color="var(--color-success)" size={100} />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">{t("Present", "حاضر")}</span><span className="font-medium">{data.employees.present}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">{t("Late", "متأخر")}</span><span className="font-medium text-warning">{data.employees.late} ({data.employees.latePercent.toFixed(1)}%)</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">{t("Absent", "غائب")}</span><span className="font-medium text-danger">{data.employees.absent}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">{t("Worked hours", "ساعات العمل")}</span><span className="font-medium">{data.employees.workedHours.toFixed(0)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-secondary">{t("Overtime", "ساعات إضافية")}</span><span className="font-medium text-gold">{data.employees.overtimeHours.toFixed(0)}</span></div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-surface rounded-lg flex justify-between">
                <span className="text-xs text-text-secondary">{t("Payroll cost", "تكلفة الرواتب")}</span>
                <span className="text-sm font-bold">{currency(data.employees.payrollCost)}</span>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-text-primary">{t("Risk Engine", "محرك المخاطر")}</h3>
              </div>
              <div className="flex items-center gap-4">
                <DonutChart value={data.risks.score.overall} label={`${data.risks.score.overall.toFixed(0)}`}
                  sublabel={t("Risk score", "مؤشر المخاطر")} color={data.risks.score.level === "low" ? "var(--color-success)" : data.risks.score.level === "medium" ? "var(--color-gold)" : "var(--color-danger)"} size={100} />
                <div className="flex-1">
                  <Badge variant={severityColors[data.risks.score.level] || "default"}>{data.risks.score.level}</Badge>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-text-secondary">{t("Critical", "حرج")}</span><span>{data.risks.score.counts.critical}</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">{t("High", "عالية")}</span><span>{data.risks.score.counts.high}</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">{t("Medium", "متوسطة")}</span><span>{data.risks.score.counts.medium}</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">{t("Low", "منخفضة")}</span><span>{data.risks.score.counts.low}</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2 max-h-52 overflow-auto">
                {data.risks.items.slice(0, 8).map((r) => (
                  <div key={r.code} className="p-3 bg-surface rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-text-primary">{isArabic ? r.labelAr : r.label}</p>
                      {riskBadge(r.severity)}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">{r.recommendation}</p>
                  </div>
                ))}
                {data.risks.items.length === 0 && (
                  <p className="text-sm text-text-secondary">{t("No active risks", "لا توجد مخاطر نشطة")}</p>
                )}
              </div>
            </Card>
          </div>

          {data.buildings.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.buildings.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-gold" />
                    <span className="font-semibold text-text-primary">{b.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>{t("Progress", "الإنجاز")}</span><span>{b.progress.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={b.progress} color={b.progress >= 80 ? "var(--color-success)" : b.progress >= 40 ? "var(--color-gold)" : "var(--color-warning)"} />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-2 bg-surface rounded-lg"><p className="text-[10px] text-text-secondary">{t("Profit", "الربح")}</p><p className={`text-sm font-bold ${b.profit >= 0 ? "text-success" : "text-danger"}`}>{currency(b.profit)}</p></div>
                    <div className="p-2 bg-surface rounded-lg"><p className="text-[10px] text-text-secondary">{t("Margin", "الهامش")}</p><p className="text-sm font-bold">{b.margin.toFixed(1)}%</p></div>
                    <div className="p-2 bg-surface rounded-lg"><p className="text-[10px] text-text-secondary">{t("Extracts", "المستخلصات")}</p><p className="text-sm font-bold">{b.extracts.count}</p></div>
                    <div className="p-2 bg-surface rounded-lg"><p className="text-[10px] text-text-secondary">{t("Delays", "التأخيرات")}</p><p className={`text-sm font-bold ${b.delays > 0 ? "text-warning" : "text-text-primary"}`}>{b.delays}</p></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!drill} onClose={() => setDrill(null)} title={drill?.title || ""} size="md">
        {drill && <div className="max-h-[60vh] overflow-auto">{drillRender(drill.node, 0)}</div>}
      </Dialog>
    </div>
  );
}
