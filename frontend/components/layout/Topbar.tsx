/* eslint-disable */
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Search, Bell, ChevronDown, LogOut, User, Menu, Globe } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import GlobalSearch from "@/components/shared/GlobalSearch";
import { useTheme } from "@/components/ThemeProvider";
import { notificationService, type Notification } from "@/services/notification.service";
import { useUnreadCount, refreshUnreadCount } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { resolveNotificationHref } from "@/lib/notificationLink";

interface TopbarProps {
  isArabic: boolean;
  onMenuToggle: () => void;
}

export default function Topbar({ isArabic, onMenuToggle }: TopbarProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<Notification[]>([]);
  const { unreadCount, refresh } = useUnreadCount();
  const { user, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "Escape" && searchOpen) setSearchOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [searchOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const load = () => notificationService.list({ limit: 20 }).then(setNotifItems).catch(() => {});
    load();
    refresh();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [notifOpen, refresh]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      await refresh();
      setNotifItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleNotifClick = async (n: Notification) => {
    try {
      if (!n.read) {
        await notificationService.markRead(n.id);
        await refresh();
        setNotifItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      }
    } catch {}
    const href = resolveNotificationHref(n, locale);
    setNotifOpen(false);
    if (href) router.push(href);
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const knownSegments: Record<string, { en: string; ar: string }> = {
    admin: { en: "Dashboard", ar: "لوحة التحكم" },
    users: { en: "Users", ar: "المستخدمين" },
    projects: { en: "Projects", ar: "المشاريع" },
    buildings: { en: "Buildings", ar: "المباني" },
    employees: { en: "Employees", ar: "الموظفين" },
    attendance: { en: "Attendance", ar: "الحضور" },
    clients: { en: "Clients", ar: "العملاء" },
    suppliers: { en: "Suppliers", ar: "الموردين" },
    subcontractors: { en: "Subcontractors", ar: "المقاولين من الباطن" },
    inventory: { en: "Inventory", ar: "المخزون" },
    warehouses: { en: "Warehouses", ar: "المستودعات" },
    treasury: { en: "Treasury", ar: "الخزينة" },
    statements: { en: "Statements", ar: "الكشوفات" },
    notifications: { en: "Notifications", ar: "الإشعارات" },
    profile: { en: "Profile", ar: "الملف الشخصي" },
    estimates: { en: "Estimates", ar: "المقايسات" },
    extracts: { en: "Extracts", ar: "المستخلصات" },
    payments: { en: "Payments", ar: "المدفوعات" },
    miscellaneous: { en: "Miscellaneous", ar: "متنوع" },
    purchases: { en: "Purchases", ar: "المشتريات" },
    boards: { en: "Boards", ar: "اللوحات" },
    "client-statements": { en: "Client Statements", ar: "كشوفات العميل" },
    roles: { en: "Roles", ar: "الأدوار" },
    holidays: { en: "Holidays", ar: "الإجازات" },
    categories: { en: "Categories", ar: "التصنيفات" },
    "project-boards": { en: "Project Boards", ar: "لوحات المشروع" },
    "stock-movements": { en: "Stock Movements", ar: "حركات المخزون" },
    analytics: { en: "Analytics", ar: "التحليلات" },
  };

  const entityUuidParents: Record<string, { en: string; ar: string }> = {
    projects: { en: "Project", ar: "المشروع" },
    buildings: { en: "Building", ar: "المبنى" },
    subcontractors: { en: "Subcontractor", ar: "المقاول من الباطن" },
    extracts: { en: "Extract", ar: "المستخلص" },
    clients: { en: "Client", ar: "العميل" },
    employees: { en: "Employee", ar: "الموظف" },
    suppliers: { en: "Supplier", ar: "المورد" },
    warehouses: { en: "Warehouse", ar: "المستودع" },
    users: { en: "User", ar: "المستخدم" },
    payments: { en: "Payment", ar: "الدفعة" },
    estimates: { en: "Estimate", ar: "المقايسة" },
    notifications: { en: "Notification", ar: "الإشعار" },
    categories: { en: "Category", ar: "التصنيف" },
    inventory: { en: "Inventory", ar: "المخزون" },
  };

  const segmentToLabel = (seg: string, prevSeg: string | undefined): string => {
    if (knownSegments[seg]) {
      return isArabic ? knownSegments[seg].ar : knownSegments[seg].en;
    }
    if (uuidRegex.test(seg) && prevSeg && entityUuidParents[prevSeg]) {
      return isArabic ? entityUuidParents[prevSeg].ar : entityUuidParents[prevSeg].en;
    }
    return decodeURIComponent(seg);
  };

  const alternateLocale = locale === "ar" ? "en" : "ar";

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .slice(1)
    .map((seg, i, arr) => ({
      label: segmentToLabel(seg, arr[i - 1]),
      href: "/" + arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
    }));

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left side — Breadcrumb + Desktop Menu Toggle */}
        <div className="flex items-center gap-3">
          <button suppressHydrationWarning onClick={onMenuToggle} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors lg:hidden">
            <Menu size={20} />
          </button>
          <nav className="hidden sm:flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {!crumb.isLast ? (
                  <>
                    <Link href={crumb.href} className="text-text-muted hover:text-text-primary transition-colors">
                      {crumb.label}
                    </Link>
                    <span className="text-text-muted">/</span>
                  </>
                ) : (
                  <span className="text-text-primary font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button suppressHydrationWarning onClick={() => setSearchOpen(true)} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors">
            <Search size={18} />
          </button>
          <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

          {/* Language */}
          <Link
            href={pathname.replace(`/${locale}`, `/${alternateLocale}`)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
            title={alternateLocale === "ar" ? "العربية" : "English"}
          >
            <Globe size={18} />
          </Link>

          {/* Theme */}
          <ThemeToggle />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button suppressHydrationWarning onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-dropdown overflow-hidden animate-fade-in-down">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm text-text-primary">{isArabic ? "الإشعارات" : "Notifications"}</h3>
                  <button suppressHydrationWarning onClick={handleMarkAllRead} className="text-xs text-gold hover:underline">{isArabic ? "الكل مقروء" : "Mark all read"}</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifItems.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-text-muted">{isArabic ? "لا توجد إشعارات" : "No notifications"}</p>
                  )}
                  {notifItems.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      suppressHydrationWarning
                      onClick={() => handleNotifClick(n)}
                      className={cn("w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-secondary transition-colors cursor-pointer", !n.read && "bg-gold-50/50")}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.read ? "bg-transparent" : "bg-gold")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{isArabic && n.title ? n.title : n.titleEn || n.title}</p>
                        <p className="text-xs text-text-muted truncate">{isArabic && n.message ? n.message : n.messageEn || n.message}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{new Date(n.date).toLocaleString(isArabic ? "ar" : "en")}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Link href={`/${locale}/notifications`} className="block px-4 py-2.5 text-center text-sm text-gold hover:bg-surface-secondary transition-colors border-t border-border">
                  {isArabic ? "عرض الكل" : "View all"}
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button suppressHydrationWarning onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                  {user?.name?.charAt(0).toUpperCase() ?? (isArabic ? "م" : "U")}
                </div>
              )}
              <ChevronDown size={14} className="text-text-muted hidden sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-dropdown py-1 animate-fade-in-down">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.name ?? "—"}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email ?? ""}</p>
                </div>
                <Link href={`/${locale}/profile`} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors">
                  <User size={16} /> {isArabic ? "الملف الشخصي" : "Profile"}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.replace(`/${locale}`);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-light transition-colors w-full text-start"
                >
                  <LogOut size={16} /> {isArabic ? "تسجيل الخروج" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
