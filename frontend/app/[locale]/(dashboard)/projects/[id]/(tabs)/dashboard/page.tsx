/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import {
  projectDashboardService,
  type ProjectDashboard,
} from "@/services/project-dashboard.service";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  ClipboardCheck,
} from "lucide-react";

export default function ProjectDashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const [data, setData] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const t = (en: string, ar: string) => (isArabic ? ar : en);

  useEffect(() => {
    if (!projectId) return;
    projectDashboardService
      .getDashboard(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <DataLoader />;
  if (!data) return null;

  const { project, financials, stats, alerts } = data;

  const severityColor = (severity: string) => {
    switch (severity) {
      case "warning":
        return "bg-warning/10 border-warning/30 text-warning-dark";
      case "danger":
        return "bg-danger/10 border-danger/30 text-danger-dark";
      default:
        return "bg-info/10 border-info/30 text-info-dark";
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "danger":
        return <AlertTriangle className="w-5 h-5 text-danger" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <CheckCircle className="w-5 h-5 text-info" />;
    }
  };

  const fmt = (n: number) => n.toLocaleString("en");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("Project Dashboard", "لوحة المشروع")}
          </h1>
          <p className="text-text-secondary text-sm">
            {project.name}
          </p>
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 border-r-4 border-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Revenue", "الإيرادات")}
              </p>
              <p className="text-lg font-bold text-success">
                {fmt(financials.totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-r-4 border-danger">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Costs", "التكلفة")}
              </p>
              <p className="text-lg font-bold text-danger">
                {fmt(financials.totalCosts)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 border-r-4 ${financials.grossProfit >= 0 ? "border-success" : "border-danger"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${financials.grossProfit >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
              <DollarSign className={`w-5 h-5 ${financials.grossProfit >= 0 ? "text-success" : "text-danger"}`} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Profit", "الربح")}
              </p>
              <p className={`text-lg font-bold ${financials.grossProfit >= 0 ? "text-success" : "text-danger"}`}>
                {fmt(financials.grossProfit)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 border-r-4 ${financials.netCashFlow >= 0 ? "border-info" : "border-danger"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${financials.netCashFlow >= 0 ? "bg-info/10" : "bg-danger/10"}`}>
              <DollarSign className={`w-5 h-5 ${financials.netCashFlow >= 0 ? "text-info" : "text-danger"}`} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Cash Flow", "التدفق النقدي")}
              </p>
              <p className={`text-lg font-bold ${financials.netCashFlow >= 0 ? "text-info" : "text-danger"}`}>
                {fmt(financials.netCashFlow)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-r-4 border-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Payments Received", "المدفوعات المستلمة")}
              </p>
              <p className="text-lg font-bold text-success">
                {fmt(financials.paymentsReceived)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-r-4 border-warning">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">
                {t("Payments Made", "المدفوعات الصادرة")}
              </p>
              <p className="text-lg font-bold text-warning">
                {fmt(financials.paymentsMade)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.buildingCount}</p>
              <p className="text-xs text-text-secondary">{t("Buildings", "المباني")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.employeeCount}</p>
              <p className="text-xs text-text-secondary">{t("Employees", "الموظفون")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.extractCount}</p>
              <p className="text-xs text-text-secondary">{t("Extracts", "المستخلصات")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.pendingApprovals}</p>
              <p className="text-xs text-text-secondary">{t("Pending Approvals", "الموافقات المعلقة")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.pendingStatements}</p>
              <p className="text-xs text-text-secondary">{t("Pending Statements", "البيانات المعلقة")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.recentPurchases}</p>
              <p className="text-xs text-text-secondary">{t("Recent Purchases", "المشتريات الأخيرة")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-text-primary mb-4">
            {t("Alerts", "التنبيهات")}
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor(alert.severity)}`}
              >
                <div className="mt-0.5">{severityIcon(alert.severity)}</div>
                <div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-70 capitalize">{alert.type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Project info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-text-primary mb-4">
            {t("Project Progress", "تقدم المشروع")}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>{t("Progress", "الإنجاز")}</span>
                <span className="font-bold text-gold">{project.progress}%</span>
              </div>
              <div className="w-full bg-surface-tertiary rounded-full h-3">
                <div
                  className="bg-gold rounded-full h-3 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="text-sm text-text-secondary">
                {t("Status", "الحالة")}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${
                project.status === "active"
                  ? "bg-success-light text-success-dark border-success/30"
                  : project.status === "completed"
                  ? "bg-info-light text-info-dark border-info/30"
                  : "bg-warning-light text-warning-dark border-warning/30"
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-text-primary mb-4">
            {t("Project Info", "معلومات المشروع")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="text-sm text-text-secondary">
                {t("Start Date", "تاريخ البدء")}
              </span>
              <span className="text-sm font-medium">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString(
                      isArabic ? "ar-EG" : "en-US"
                    )
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <span className="text-sm text-text-secondary">
                {t("Planned Duration", "المدة المخططة")}
              </span>
              <span className="text-sm font-medium">
                {project.plannedDurationMonths} {t("months", "شهر")}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
