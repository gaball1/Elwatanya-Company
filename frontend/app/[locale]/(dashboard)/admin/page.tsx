/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { shortRef } from "@/lib/formatRef";
import {
  Building2, TrendingUp, Users, DollarSign, Package,
  FileText, Bell, ArrowUpRight, ArrowDownRight, Clock,
  Calendar, CheckCircle2, AlertTriangle, Activity,
  BarChart3, PieChart, Wallet, ClipboardList, UserCheck,
  Plus, Eye, ChevronLeft
} from "lucide-react";
import { projectService } from "@/services/project.service";
import { employeeService } from "@/services/employee.service";
import { attendanceService } from "@/services/attendance.service";
import { subcontractorService } from "@/services/subcontractor.service";
import { inventoryItemService } from "@/services/inventory-item.service";
import { projectFundService } from "@/services/project-fund.service";
import { notificationService } from "@/services/notification.service";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color: string;
  link: string;
  index: number;
}

function KpiCard({ label, value, icon, trend, color, link, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={link}>
        <Card className="relative overflow-hidden group cursor-pointer p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              {trend && (
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", trend.positive ? "text-success" : "text-danger")}>
                  {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {trend.value}
                </span>
              )}
            </div>
            <div className={cn("p-3 rounded-xl", color)}>
              <div className="text-white">{icon}</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      </Link>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [projectFunds, setProjectFunds] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      projectService.getProjects(),
      employeeService.list(),
      attendanceService.list(),
      subcontractorService.list(),
      inventoryItemService.list(),
      projectFundService.list(),
      notificationService.list(),
    ])
      .then(([p, emp, att, sub, inv, funds, notif]) => {
        setProjects(p);
        setEmployees(emp);
        setAttendanceRecords(att);
        setSubcontractors(sub);
        setInventoryItems(inv);
        setProjectFunds(funds);
        setNotifications(notif);
      })
      .catch((err) => console.error("[AdminDashboard] Failed to load data:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalSubcontractors = subcontractors.length;
  const totalFunds = projectFunds.reduce((s, f) => s + f.currentBalance, 0);
  const totalQty = inventoryItems.reduce((s, i) => s + i.quantity, 0);
  const progressAvg = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0;
  const totalEmployees = employees.length;
  const todayDate = new Date().toISOString().split("T")[0];
  const todayAttendance = attendanceRecords.filter((a) => a.date === todayDate).length;
  const lowStockItems = inventoryItems.filter((i) => i.quantity <= i.minQuantity).length;

  const kpiCards = [
    { label: isArabic ? "إجمالي المشاريع" : "Total Projects", value: totalProjects, icon: <Building2 size={20} />, color: "bg-primary", link: `/${locale}/projects`, trend: undefined, index: 0 },
    { label: isArabic ? "مشاريع نشطة" : "Active Projects", value: activeProjects, icon: <Activity size={20} />, color: "bg-success", link: `/${locale}/projects`, trend: undefined, index: 1 },
    { label: isArabic ? "المقاولين" : "Subcontractors", value: totalSubcontractors, icon: <Users size={20} />, color: "bg-gold", link: `/${locale}/subcontractors`, trend: undefined, index: 2 },
    { label: isArabic ? "إجمالي العهد" : "Total Funds", value: `${(totalFunds / 1000000).toFixed(1)}M ${isArabic ? "ج.م" : "EGP"}`, icon: <Wallet size={20} />, color: "bg-info", link: `/${locale}/projects`, trend: undefined, index: 3 },
    { label: isArabic ? "أصناف المخازن" : "Inventory Items", value: totalQty, icon: <Package size={20} />, color: "bg-warning", link: `/${locale}/inventory`, trend: undefined, index: 4 },
    { label: isArabic ? "متوسط الإنجاز" : "Avg Progress", value: `${progressAvg}%`, icon: <TrendingUp size={20} />, color: "bg-danger", link: `/${locale}/projects`, trend: undefined, index: 5 },
  ];

  const quickActions = [
    { label: isArabic ? "مشروع جديد" : "New Project", icon: <Plus size={18} />, href: `/${locale}/projects`, color: "bg-gold/10 text-gold" },
    { label: isArabic ? "مقاول جديد" : "New Subcontractor", icon: <Users size={18} />, href: `/${locale}/subcontractors`, color: "bg-primary/10 text-primary" },
    { label: isArabic ? "مستخلص جديد" : "New Statement", icon: <FileText size={18} />, href: `/${locale}/statements/new`, color: "bg-success/10 text-success" },
    { label: isArabic ? "حركة مخزون" : "Stock Movement", icon: <Package size={18} />, href: `/${locale}/inventory`, color: "bg-warning/10 text-warning" },
  ];

  const recentProjects = projects.slice(0, 4);

  const notificationIcons: Record<string, React.ReactNode> = {
    info: <FileText size={16} />,
    warning: <Clock size={16} />,
    error: <AlertTriangle size={16} />,
    success: <CheckCircle2 size={16} />,
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const liveNotifications = notifications.slice(0, 4).map((n) => ({
    type: n.type as "info" | "warning" | "error" | "success",
    title: isArabic ? n.title : (n as any).titleEn || n.title,
    message: isArabic ? n.message : (n as any).messageEn || n.message,
    time: timeAgo(n.createdAt),
    icon: notificationIcons[n.type] || <FileText size={16} />,
  }));

  const iconColors: Record<string, string> = {
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    error: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-80 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {isArabic ? "لوحة التحكم" : "Dashboard"}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {isArabic ? "مرحباً بك في نظام الوطنية للتنمية العمرانية" : "Welcome to El Wataniya Urban Development System"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" size="sm">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {isArabic ? "النظام يعمل" : "System Online"}
            </span>
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              {isArabic ? "إجراءات سريعة" : "Quick Actions"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]", action.color)}>
                  {action.icon}
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent Projects */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {isArabic ? "آخر المشاريع" : "Recent Projects"}
              </h2>
              <Link href={`/${locale}/projects`} className="text-xs text-gold hover:underline flex items-center gap-1">
                {isArabic ? "عرض الكل" : "View all"} <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{isArabic ? "لا توجد مشاريع" : "No projects yet"}</p>
                </div>
              ) : (
                recentProjects.map((project) => (
                  <Link key={project.id} href={`/${locale}/projects/${project.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-secondary transition-colors group">
                    <div className={cn("p-2.5 rounded-lg", project.status === "active" ? "bg-success/10" : "bg-info/10")}>
                      <Building2 size={18} className={project.status === "active" ? "text-success" : "text-info"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-gold transition-colors">{project.name}</p>
                      <p className="text-xs text-text-muted truncate">{project.location}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={project.status === "active" ? "success" : "info"} size="sm">
                        {project.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "مكتمل" : "Completed")}
                      </Badge>
                    </div>
                    <div className="w-24">
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>{project.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Treasury & Inventory Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-success/10">
                  <Wallet size={18} className="text-success" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary">
                  {isArabic ? "العهد" : "Treasury"}
                </h2>
              </div>
              <div className="space-y-3">
                {projectFunds.slice(0, 3).map((fund) => {
                  const proj = projects.find((p) => p.id === fund.projectId);
                  return (
                    <div key={fund.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary truncate">{proj?.name || `Project ${shortRef(fund.projectId)}`}</span>
                      <span className="font-medium text-text-primary">{fund.currentBalance.toLocaleString()} {isArabic ? "ج.م" : "EGP"}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Package size={18} className="text-warning" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary">
                  {isArabic ? "المخزون" : "Inventory"}
                </h2>
              </div>
              <div className="space-y-3">
                {inventoryItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary truncate">{item.name}</span>
                    <span className="font-medium text-text-primary">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar — Activity & Notifications */}
        <div className="space-y-6">
          {/* Stats Summary */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              {isArabic ? "ملخص سريع" : "Quick Summary"}
            </h2>
            <div className="space-y-4">
              {[
                { label: isArabic ? "الموظفين" : "Employees", value: totalEmployees, icon: <UserCheck size={16} />, color: "text-primary", bg: "bg-primary/5" },
                { label: isArabic ? "الحضور اليوم" : "Today Attendance", value: todayAttendance, icon: <Calendar size={16} />, color: "text-success", bg: "bg-success/5" },
                { label: isArabic ? "المواد منخفضة" : "Low Stock Items", value: lowStockItems, icon: <AlertTriangle size={16} />, color: "text-danger", bg: "bg-danger/5" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-text-muted">{stat.label}</p>
                    <p className="text-sm font-semibold text-text-primary">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notifications Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bell size={16} className="text-gold" />
                {isArabic ? "آخر الإشعارات" : "Latest Updates"}
              </h2>
              <Link href={`/${locale}/notifications`} className="text-xs text-gold hover:underline">
                {isArabic ? "عرض الكل" : "View all"}
              </Link>
            </div>
            <div className="space-y-3">
              {liveNotifications.map((n, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                >
                  <div className={cn("p-1.5 rounded-lg shrink-0", iconColors[n.type])}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{n.title}</p>
                    <p className="text-xs text-text-muted truncate">{n.message}</p>
                  </div>
                  <span className="text-[11px] text-text-muted whitespace-nowrap">{n.time}</span>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Attendance Summary */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-success" />
              {isArabic ? "الحضور اليوم" : "Today's Attendance"}
            </h2>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-surface-tertiary)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-gold)" strokeWidth="3"
                    strokeDasharray="97.4" strokeDashoffset={97.4 - (97.4 * (totalEmployees ? Math.round((todayAttendance / totalEmployees) * 100) : 0)) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-bold text-text-primary">{totalEmployees ? Math.round((todayAttendance / totalEmployees) * 100) : 0}%</span>
                  <span className="text-[10px] text-text-muted">{todayAttendance}/{totalEmployees}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-success/5">
                <p className="font-semibold text-success">{todayAttendance}</p>
                <p className="text-text-muted">{isArabic ? "موجود" : "Present"}</p>
              </div>
              <div className="p-2 rounded-lg bg-danger/5">
                <p className="font-semibold text-danger">{totalEmployees - todayAttendance}</p>
                <p className="text-text-muted">{isArabic ? "غائب" : "Absent"}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
