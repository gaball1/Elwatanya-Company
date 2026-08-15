/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, Building2, Users, Briefcase,
  Truck, Package, Warehouse, Bell, Calendar, SunSnow, Layers,
  ChevronLeft, ChevronDown, PanelLeftClose, PanelLeft,
  FileText, Banknote, BarChart3, Settings,
  LogOut, Shield, CheckCircle, Bot, Pen, Activity, ClipboardCheck,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  permissions?: string[];
  children?: { label: string; href: string; permissions?: string[] }[];
  employeeSelfService?: boolean;
}

interface SidebarProps {
  isArabic: boolean;
  collapsed: boolean;
  onToggle: () => void;
  userPermissions: string[];
  userEmployeeId?: string | null;
}

export default function Sidebar({ isArabic, collapsed, onToggle, userPermissions, userEmployeeId }: SidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? "ar";
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_groups");
    if (saved) setExpandedGroups(JSON.parse(saved));
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sidebar_groups", JSON.stringify(next));
      return next;
    });
  }, []);

  const hasPermission = (perms?: string[]) => {
    if (!perms || perms.length === 0) return true;
    return perms.some((p) => userPermissions.includes(p));
  };

  const canShowItem = (item: MenuItem) => {
    if (!mounted) return true;
    if (item.employeeSelfService) {
      return hasPermission(item.permissions) || !!userEmployeeId;
    }
    return hasPermission(item.permissions);
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const menuGroups: { key: string; label: string; items: MenuItem[] }[] = [
    {
      key: "main",
      label: isArabic ? "الرئيسية" : "Main",
      items: [
        { label: isArabic ? "لوحة التحكم" : "Dashboard", icon: <LayoutDashboard size={20} />, href: `/${locale}/admin` },
      ],
    },
    {
      key: "admin",
      label: isArabic ? "الإدارة" : "Administration",
      items: [
        { label: isArabic ? "المستخدمين" : "Users", icon: <Users size={20} />, href: `/${locale}/admin/users`, permissions: ["users.read"] },
        { label: isArabic ? "صلاحيات" : "Roles", icon: <Shield size={20} />, href: `/${locale}/roles`, permissions: ["roles.read"] },
        { label: isArabic ? "انتظار التوقيع" : "Pending Signatures", icon: <Pen size={20} />, href: `/${locale}/pending-signatures`, permissions: ["profile.update"] },
        { label: isArabic ? "المساعد الذكي" : "AI Agent", icon: <Bot size={20} />, href: `/${locale}/admin/ai-agent`, permissions: ["admin"] },
        { label: isArabic ? "التوقيعات" : "Signatures", icon: <Pen size={20} />, href: `/${locale}/admin/signatures`, permissions: ["profile.update"] },
        { label: isArabic ? "إعدادات الشركة" : "Company Settings", icon: <Settings size={20} />, href: `/${locale}/admin/settings`, permissions: ["company.read"] },
      ],
    },
    {
      key: "projects",
      label: isArabic ? "المشاريع" : "Projects",
      items: [
        { label: isArabic ? "المشاريع" : "Projects", icon: <FolderKanban size={20} />, href: `/${locale}/projects`, permissions: ["projects.read"] },
        { label: isArabic ? "لوحة المؤشرات" : "KPI Dashboard", icon: <Activity size={20} />, href: `/${locale}/bi-dashboard`, permissions: ["projects.read"] },
        { label: isArabic ? "لوحة الإدارة" : "Executive Dashboard", icon: <LayoutDashboard size={20} />, href: `/${locale}/executive-dashboard`, permissions: ["projects.read"] },
        { label: isArabic ? "التحليلات" : "Analytics", icon: <BarChart3 size={20} />, href: `/${locale}/analytics`, permissions: ["projects.read"] },
        { label: isArabic ? "التقارير" : "Reports", icon: <BarChart3 size={20} />, href: `/${locale}/reports`, permissions: ["reports.read"] },
      ],
    },
    {
      key: "people",
      label: isArabic ? "الأطراف" : "Parties",
      items: [
        { label: isArabic ? "الموظفين" : "Employees", icon: <Briefcase size={20} />, href: `/${locale}/employees`, permissions: ["employees.read"] },
        { label: isArabic ? "الأقسام" : "Departments", icon: <Building2 size={20} />, href: `/${locale}/departments`, permissions: ["departments.read"] },
        { label: isArabic ? "الحضور والانصراف" : "Attendance", icon: <Calendar size={20} />, href: `/${locale}/attendance`, permissions: ["attendance.read"], employeeSelfService: true },
        { label: isArabic ? "طلبات الحضور" : "Attendance Requests", icon: <ClipboardCheck size={20} />, href: `/${locale}/attendance/overrides`, permissions: ["attendance.update"] },
        { label: isArabic ? "الإجازات" : "Holidays", icon: <SunSnow size={20} />, href: `/${locale}/holidays`, permissions: ["holidays.read"] },
        { label: isArabic ? "المقاولين" : "Subcontractors", icon: <Users size={20} />, href: `/${locale}/subcontractors`, permissions: ["subcontractors.read"] },
        { label: isArabic ? "العملاء" : "Clients", icon: <Building2 size={20} />, href: `/${locale}/clients`, permissions: ["clients.read"] },
        { label: isArabic ? "الموردين" : "Suppliers", icon: <Truck size={20} />, href: `/${locale}/suppliers`, permissions: ["suppliers.read"] },
      ],
    },
    {
      key: "inventory",
      label: isArabic ? "مخازن" : "Warehouses",
      items: [
        { label: isArabic ? "المخازن" : "Warehouses", icon: <Warehouse size={20} />, href: `/${locale}/warehouses`, permissions: ["warehouses.read"] },
        { label: isArabic ? "حركات المخزون" : "Stock Movements", icon: <ArrowRightLeft size={20} />, href: `/${locale}/stock-movements`, permissions: ["stock-movements.read"] },
        { label: isArabic ? "المخزون" : "Inventory", icon: <Package size={20} />, href: `/${locale}/inventory`, permissions: ["inventory.read"] },
        { label: isArabic ? "التصنيفات" : "Categories", icon: <Layers size={20} />, href: `/${locale}/categories`, permissions: ["categories.read"] },
      ],
    },
    {
      key: "financial",
      label: isArabic ? "المالية" : "Financial",
      items: [
        { label: isArabic ? "الموافقات" : "Approvals", icon: <CheckCircle size={20} />, href: `/${locale}/approvals`, permissions: ["approvals.read"] },
        { label: isArabic ? "كشوف المقاولين" : "Contractor Statements", icon: <FileText size={20} />, href: `/${locale}/statements`, permissions: ["subcontractor-statements.read"] },
        { label: isArabic ? "كشوف العملاء" : "Client Statements", icon: <BarChart3 size={20} />, href: `/${locale}/client-statements`, permissions: ["client-statements.read"] },
      ],
    },
    {
      key: "system",
      label: isArabic ? "النظام" : "System",
      items: [
        { label: isArabic ? "الإشعارات" : "Notifications", icon: <Bell size={20} />, href: `/${locale}/notifications` },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 h-full bg-surface border-l border-border shadow-sidebar z-30 flex flex-col transition-all duration-300",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      )}
      dir="ltr"
    >
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-border shrink-0", collapsed ? "justify-center" : "gap-3")}>
        <img src="/logo11.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-contain shrink-0" />
        {!collapsed && (
          <span className="font-bold text-gold text-base truncate">{isArabic ? "الوطنية" : "El Wataniya"}</span>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-[52px] w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-surface-secondary transition-colors z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" dir={isArabic ? "rtl" : "ltr"}>
        <LayoutGroup>
          {menuGroups.map((group) => (
          <div key={group.key}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
              >
                {group.label}
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    expandedGroups[group.key] !== false && "rotate-180"
                  )}
                />
              </button>
            )}
            <AnimatePresence initial={false}>
              {(collapsed || expandedGroups[group.key] !== false) && (
                <motion.div
                  initial={collapsed ? undefined : { height: 0, opacity: 0 }}
                  animate={collapsed ? undefined : { height: "auto", opacity: 1 }}
                  exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {group.items.filter(canShowItem).map((item) => (
                    <div key={item.label}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                            collapsed ? "justify-center mx-0" : "mx-1",
                            isActive(item.href)
                              ? "bg-gold/10 text-gold"
                              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {isActive(item.href) && (
                            <motion.span
                              layoutId="activeTab"
                              className={cn(
                                "absolute right-0 w-1 h-6 bg-gold rounded-full",
                                collapsed ? "hidden" : ""
                              )}
                            />
                          )}
                        </Link>
                      ) : (
                        <div className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary", collapsed ? "justify-center" : "")}>
                          <span className="shrink-0">{item.icon}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          ))}
        </LayoutGroup>
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 shrink-0" dir={isArabic ? "rtl" : "ltr"}>
        <Link
          href={`/${locale}`}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-danger hover:bg-surface-secondary transition-colors",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? (isArabic ? "خروج" : "Logout") : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>{isArabic ? "تسجيل الخروج" : "Logout"}</span>}
        </Link>
      </div>
    </aside>
  );
}
