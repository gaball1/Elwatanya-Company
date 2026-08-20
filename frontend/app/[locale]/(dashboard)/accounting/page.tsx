/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import DataLoader from "@/components/shared/DataLoader";
import ExportButtons from "@/components/shared/ExportButtons";
import { accountingService, type AccountingDashboard, type ProjectAccounting } from "@/services/accounting.service";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
  Wallet, Receipt, CreditCard, PieChart, RefreshCw,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtSigned = (n: number, isArabic: boolean) => {
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}${fmt(n)} ${isArabic ? "ج.م" : "EGP"}`;
};

export default function AccountingDashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const [data, setData] = useState<AccountingDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingService.getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DataLoader />;
  if (!data) return <div className="p-8 text-center text-text-muted">{isArabic ? "فشل تحميل البيانات" : "Failed to load data"}</div>;

  const t = data.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={24} />
            {isArabic ? "لوحة المحاسبة والميزانية" : "Accounting & Budget Dashboard"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isArabic ? "ملخص مالي شامل لجميع المشاريع" : "Comprehensive financial summary across all projects"}
          </p>
        </div>
        <ExportButtons
          data={data.projectSummaries}
          columns={[
            { key: "projectName", labelAr: "المشروع", labelEn: "Project" },
            { key: "totalRevenue", labelAr: "الإيرادات", labelEn: "Revenue", format: (v) => fmt(v) },
            { key: "totalCosts", labelAr: "التكاليف", labelEn: "Costs", format: (v) => fmt(v) },
            { key: "grossProfit", labelAr: "الربح", labelEn: "Profit", format: (v) => fmt(v) },
            { key: "totalPaymentsReceived", labelAr: "المدفوعات الواردة", labelEn: "Received", format: (v) => fmt(v) },
            { key: "totalPaymentsMade", labelAr: "المدفوعات الصادرة", labelEn: "Paid", format: (v) => fmt(v) },
            { key: "netCashFlow", labelAr: "صافي التدفق", labelEn: "Net Cash Flow", format: (v) => fmt(v) },
          ]}
          titleAr="تقرير المحاسبة"
          titleEn="Accounting Report"
          filename="accounting"
          locale={locale}
        />
      </div>

      {/* Grand Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-success">{fmt(t.totalRevenue)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "إجمالي الإيرادات" : "Total Revenue"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <TrendingDown size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-lg font-bold text-danger">{fmt(t.totalCosts)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "إجمالي التكاليف" : "Total Costs"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign size={20} className="text-primary" />
            </div>
            <div>
              <p className={`text-lg font-bold ${t.grossProfit >= 0 ? "text-success" : "text-danger"}`}>{fmt(t.grossProfit)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "إجمالي الربح" : "Gross Profit"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <ArrowDownRight size={20} className="text-info" />
            </div>
            <div>
              <p className="text-lg font-bold text-info">{fmt(t.totalPaymentsReceived)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "مدفوعات واردة" : "Payments Received"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-warning">{fmt(t.totalPaymentsMade)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "مدفوعات صادرة" : "Payments Made"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${t.netCashFlow >= 0 ? "bg-success/10" : "bg-danger/10"} flex items-center justify-center`}>
              <Wallet size={20} className={t.netCashFlow >= 0 ? "text-success" : "text-danger"} />
            </div>
            <div>
              <p className={`text-lg font-bold ${t.netCashFlow >= 0 ? "text-success" : "text-danger"}`}>{fmt(t.netCashFlow)}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "صافي التدفق" : "Net Cash Flow"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Project Breakdown Table */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {isArabic ? "تفاصيل المشاريع" : "Project Breakdown"}
          </h2>
        </div>
        {data.projectSummaries.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {isArabic ? "لا توجد مشاريع" : "No projects found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  <th className="px-4 py-3 text-start font-medium text-text-secondary">{isArabic ? "المشروع" : "Project"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "الإيرادات" : "Revenue"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "التكاليف" : "Costs"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "الربح" : "Profit"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "وارد" : "Received"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "صادر" : "Paid"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "صافي التدفق" : "Net Flow"}</th>
                  <th className="px-4 py-3 text-end font-medium text-text-secondary">{isArabic ? "نسبة الربح" : "Margin %"}</th>
                </tr>
              </thead>
              <tbody>
                {data.projectSummaries.map((p) => (
                  <tr key={p.projectId} className="border-b border-border-light hover:bg-surface-secondary/50">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/projects/${p.projectId}/dashboard`} className="font-medium text-primary hover:underline">
                        {p.projectName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-end text-success font-medium">{fmt(p.totalRevenue)}</td>
                    <td className="px-4 py-3 text-end text-danger font-medium">{fmt(p.totalCosts)}</td>
                    <td className={`px-4 py-3 text-end font-bold ${p.grossProfit >= 0 ? "text-success" : "text-danger"}`}>{fmt(p.grossProfit)}</td>
                    <td className="px-4 py-3 text-end text-info">{fmt(p.totalPaymentsReceived)}</td>
                    <td className="px-4 py-3 text-end text-warning">{fmt(p.totalPaymentsMade)}</td>
                    <td className={`px-4 py-3 text-end font-medium ${p.netCashFlow >= 0 ? "text-success" : "text-danger"}`}>{fmt(p.netCashFlow)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.totalRevenue > 0 && (p.grossProfit / p.totalRevenue) >= 0.2 ? "bg-success/10 text-success" :
                        p.totalRevenue > 0 && (p.grossProfit / p.totalRevenue) >= 0 ? "bg-warning/10 text-warning" :
                        "bg-danger/10 text-danger"
                      }`}>
                        {p.totalRevenue > 0 ? `${((p.grossProfit / p.totalRevenue) * 100).toFixed(1)}%` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
