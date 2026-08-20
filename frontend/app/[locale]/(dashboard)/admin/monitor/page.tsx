/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import DataLoader from "@/components/shared/DataLoader";
import { monitorService, type SystemHealth, type SystemMetrics } from "@/services/monitor.service";
import {
  Activity, Server, Database, Clock, Cpu, HardDrive,
  RefreshCw, CheckCircle, AlertTriangle, XCircle, Wifi,
  BarChart3, Users, Zap,
} from "lucide-react";

const STATUS_MAP: Record<string, { ar: string; en: string; icon: any; color: string; bg: string }> = {
  healthy: { ar: "سليم", en: "Healthy", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  degraded: { ar: "يحتاج انتباه", en: "Degraded", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  down: { ar: "معطل", en: "Down", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
};

const COMPONENT_LABELS: Record<string, { ar: string; en: string }> = {
  database: { ar: "قاعدة البيانات", en: "Database" },
  system: { ar: "نظام التشغيل", en: "System Load" },
  memory: { ar: "الذاكرة", en: "Memory" },
  api: { ar: "الخادم", en: "API" },
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hrs = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hrs}h ${mins}m`;
}

export default function MonitorPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([
        monitorService.health().catch(() => null),
        monitorService.metrics().catch(() => null),
      ]);
      setHealth(h);
      setMetrics(m);
    } catch {
      showToast(isArabic ? "فشل تحميل بيانات النظام" : "Failed to load system data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isArabic, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <DataLoader />;

  const overallStatus = health?.status || "healthy";
  const statusInfo = STATUS_MAP[overallStatus] || STATUS_MAP.healthy;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Activity size={24} />
            {isArabic ? "مراقبة النظام" : "System Monitor"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isArabic ? "حالة الخادم ومقاييس الأداء" : "Server health and performance metrics"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
            <StatusIcon size={16} />
            {isArabic ? statusInfo.ar : statusInfo.en}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface transition text-sm"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Clock size={20} className="text-info" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{health?.uptime ? formatUptime(health.uptime) : "-"}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "وقت التشغيل" : "Uptime"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{metrics?.totalRequests?.toLocaleString() || "0"}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "إجمالي الطلبات" : "Total Requests"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <Zap size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{metrics?.errorRate?.toFixed(1) || "0"}%</p>
              <p className="text-xs text-text-secondary">{isArabic ? "معدل الأخطاء" : "Error Rate"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Zap size={20} className="text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{metrics?.avgResponseTime?.toFixed(0) || "0"}ms</p>
              <p className="text-xs text-text-secondary">{isArabic ? "متوسط الاستجابة" : "Avg Response"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Health Components */}
      {health?.components && Object.keys(health.components).length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Server size={18} />
            {isArabic ? "مكونات النظام" : "System Components"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(health.components).map(([key, comp]) => {
              const compStatus = STATUS_MAP[comp.status] || STATUS_MAP.healthy;
              const CompIcon = compStatus.icon;
              return (
                <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${compStatus.bg}`}>
                  <div className="flex items-center gap-3">
                    <CompIcon size={18} className={compStatus.color} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {isArabic ? (COMPONENT_LABELS[key]?.ar || key) : (COMPONENT_LABELS[key]?.en || key)}
                      </p>
                      {comp.message && <p className="text-xs text-text-muted">{comp.message}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${compStatus.color}`}>
                      {isArabic ? compStatus.ar : compStatus.en}
                    </span>
                    <p className="text-xs text-text-muted">{comp.latency}ms</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      {metrics && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            {isArabic ? "مقاييس الأداء" : "Performance Metrics"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-surface rounded-lg text-center">
              <Users size={18} className="text-info mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{metrics.activeUsers}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "المستخدمين النشطين" : "Active Users"}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <Database size={18} className="text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{metrics.databaseConnections}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "اتصالات قاعدة البيانات" : "DB Connections"}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <HardDrive size={18} className="text-warning mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{metrics.storageUsed?.toLocaleString() || "0"}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "المساحة المستخدمة" : "Storage Used"}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <Activity size={18} className="text-danger mx-auto mb-1" />
              <p className="text-lg font-bold text-text-primary">{metrics.failedJobs}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "المهام الفاشلة" : "Failed Jobs"}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
