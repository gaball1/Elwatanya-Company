"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  Bot, MessageSquare, Activity, AlertTriangle,
  BarChart3, Clock, Cpu, TrendingUp,
} from "lucide-react";
import { aiAgentService, type IntentStat, type ToolStat, type WorkflowStat, type HourlyTraffic } from "@/services/ai-agent.service";

interface Stats {
  totalRequests: number;
  totalErrors: number;
  uniqueIntents: number;
  uniqueTools: number;
  uptimeSeconds: number;
  errorRate: number;
}

export default function AgentAnalyticsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const [stats, setStats] = useState<Stats | null>(null);
  const [topIntents, setTopIntents] = useState<IntentStat[]>([]);
  const [toolStats, setToolStats] = useState<ToolStat[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStat[]>([]);
  const [hourly, setHourly] = useState<HourlyTraffic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiAgentService.getAnalytics();
      setStats(data.summary);
      setTopIntents(data.topIntents || []);
      setToolStats(data.toolStats || []);
      setWorkflowStats(data.workflowStats || []);
      setHourly(data.hourly || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAnalytics().catch(() => {}); }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const kpiCards = stats ? [
    { label: isArabic ? "إجمالي الطلبات" : "Total Requests", value: stats.totalRequests, icon: <MessageSquare size={20} />, color: "bg-primary" },
    { label: isArabic ? "نسبة الأخطاء" : "Error Rate", value: `${stats.errorRate}%`, icon: <AlertTriangle size={20} />, color: stats.errorRate > 5 ? "bg-danger" : "bg-success" },
    { label: isArabic ? "الأنواع الفريدة" : "Unique Intents", value: stats.uniqueIntents, icon: <Activity size={20} />, color: "bg-gold" },
    { label: isArabic ? "الأدوات" : "Unique Tools", value: stats.uniqueTools, icon: <Cpu size={20} />, color: "bg-info" },
    { label: isArabic ? "مدة التشغيل" : "Uptime", value: formatUptime(stats.uptimeSeconds), icon: <Clock size={20} />, color: "bg-warning" },
    { label: isArabic ? "الأخطاء" : "Total Errors", value: stats.totalErrors, icon: <BarChart3 size={20} />, color: stats.totalErrors > 0 ? "bg-danger" : "bg-success" },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Bot className="text-gold" size={28} />
            {isArabic ? "تحليلات المساعد الذكي" : "AI Agent Analytics"}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {isArabic ? "إحصائيات استخدام المحرك الذكي" : "Real-time AI Agent usage statistics"}
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gold text-white rounded-xl hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {loading ? (isArabic ? "جاري التحميل..." : "Loading...") : (isArabic ? "تحديث" : "Refresh")}
        </button>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </p>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-text-muted">{kpi.label}</p>
                    <p className="text-xl font-bold text-text-primary mt-1">{kpi.value}</p>
                  </div>
                  <div className={cn("p-2 rounded-lg", kpi.color)}>
                    <div className="text-white">{kpi.icon}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!stats && !loading && !error && (
        <Card className="p-12 text-center">
          <Bot size={48} className="mx-auto mb-4 text-text-muted/50" />
          <p className="text-text-muted">{isArabic ? "لا توجد بيانات بعد. ابدأ بالتحدث مع المساعد الذكي." : "No data yet. Start chatting with the AI Agent."}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Intents */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-gold" />
            {isArabic ? "أكثر الطلبات شيوعاً" : "Top Intents"}
          </h2>
          {topIntents.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{isArabic ? "لا توجد بيانات" : "No data yet"}</p>
          ) : (
            <div className="space-y-2">
              {topIntents.map((item, i) => {
                const maxCount = topIntents[0]?.count || 1;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.intent} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-5 text-right shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-primary truncate">{item.intent}</span>
                        <span className="text-text-muted text-xs shrink-0 ml-2">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Tool Usage */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Cpu size={16} className="text-info" />
            {isArabic ? "استخدام الأدوات" : "Tool Usage"}
          </h2>
          {toolStats.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{isArabic ? "لا توجد بيانات" : "No data yet"}</p>
          ) : (
            <div className="space-y-2">
              {toolStats.map((item) => (
                <div key={item.tool} className="flex items-center justify-between text-sm py-1.5">
                  <span className="text-text-primary truncate">{item.tool}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="success" size="sm">{item.success} OK</Badge>
                    {item.failed > 0 && <Badge variant="danger" size="sm">{item.failed} ERR</Badge>}
                    <span className="text-text-muted text-xs">{item.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Workflows */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Activity size={16} className="text-success" />
            {isArabic ? "سير العمل" : "Workflows"}
          </h2>
          {workflowStats.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{isArabic ? "لم يتم تشغيل أي سير عمل" : "No workflows executed yet"}</p>
          ) : (
            <div className="space-y-3">
              {workflowStats.map((w) => (
                <div key={w.workflow} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary truncate">{w.workflow}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-success">{w.completed} ✓</span>
                    <span className="text-xs text-text-muted">{w.started} {isArabic ? "بدأ" : "started"}</span>
                    {w.failed > 0 && <span className="text-xs text-danger">{w.failed} ✗</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hourly Traffic */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-warning" />
            {isArabic ? "حركة المرور بالساعة" : "Hourly Traffic"}
          </h2>
          {hourly.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">{isArabic ? "لا توجد بيانات" : "No data yet"}</p>
          ) : (
            <div className="space-y-1">
              {hourly.map((h) => {
                const maxCount = Math.max(...hourly.map((x) => x.count), 1);
                const pct = (h.count / maxCount) * 100;
                const label = h.hour.length >= 13 ? h.hour.substring(11, 13) + ":00" : h.hour;
                return (
                  <div key={h.hour} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-text-muted w-10 shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-muted w-6 text-right shrink-0">{h.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
