/* eslint-disable */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Users,
  Building2,
  Truck,
  LogOut,
  Bell,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/lib/permissions";

interface NavbarDashboardProps {
  isArabic: boolean;
}

export default function NavbarDashboard({ isArabic }: NavbarDashboardProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? "ar";
  const userPermissions = usePermissions();

  useEffect(() => {
    setUnreadCount(3);
  }, []);

  const hasPermission = (permission: string) =>
    userPermissions.includes(permission);

  const allNavItems = [
    {
      href: `/${locale}/admin`,
      icon: <LayoutDashboard size={18} />,
      label: isArabic ? "لوحة التحكم" : "Dashboard",
      permission: null as string | null,
    },
    {
      href: `/${locale}/projects`,
      icon: <FolderKanban size={18} />,
      label: isArabic ? "المشاريع" : "Projects",
      permission: Permissions.Projects.Read,
    },
    {
      href: `/${locale}/employees`,
      icon: <Briefcase size={18} />,
      label: isArabic ? "الموظفين" : "Employees",
      permission: Permissions.Employees.Read,
    },
    {
      href: `/${locale}/departments`,
      icon: <Building2 size={18} />,
      label: isArabic ? "الأقسام" : "Departments",
      permission: Permissions.Departments.Read,
    },
    {
      href: `/${locale}/subcontractors`,
      icon: <Users size={18} />,
      label: isArabic ? "المقاولين" : "Subcontractors",
      permission: Permissions.Subcontractors.Read,
    },
    {
      href: `/${locale}/clients`,
      icon: <Building2 size={18} />,
      label: isArabic ? "العملاء" : "Clients",
      permission: Permissions.Clients.Read,
    },
    {
      href: `/${locale}/suppliers`,
      icon: <Truck size={18} />,
      label: isArabic ? "الموردين" : "Suppliers",
      permission: Permissions.Suppliers.Read,
    },
    {
      href: `/${locale}/attendance`,
      icon: <Bell size={18} />,
      label: isArabic ? "الحضور" : "Attendance",
      permission: Permissions.Attendance.Read,
    },
  ];

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.permission || hasPermission(item.permission)),
    [userPermissions, locale, isArabic]
  );

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <img
              src="/logo11.jpg"
              alt="Logo"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <span className="font-bold text-gold hidden sm:block">
              {isArabic ? "الوطنية" : "El Wataniya"}
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gold/10 text-gold"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-gold"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              href={`/${locale}/notifications`}
              className="relative"
              suppressHydrationWarning
            >
              <button
                className="relative p-2 text-text-muted hover:text-gold transition rounded-full hover:bg-surface-secondary"
                suppressHydrationWarning
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[22px] h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-md"
                    suppressHydrationWarning
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>

            {/* ThemeToggle */}
            <ThemeToggle />

            {/* Home */}
            <Link
              href={`/${locale}`}
              className="text-text-muted hover:text-gold text-sm transition-colors"
              suppressHydrationWarning
            >
              {isArabic ? "الرئيسية" : "Home"}
            </Link>

            {/* Logout */}
            <Link
              href={`/${locale}`}
              className="text-text-muted hover:text-danger transition-colors"
              suppressHydrationWarning
            >
              <button className="text-text-muted hover:text-danger transition-colors">
                <LogOut size={18} />
              </button>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-text-secondary hover:bg-surface-secondary rounded-lg"
              suppressHydrationWarning
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-gold/10 text-gold"
                      : "text-text-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                href={`/${locale}/notifications`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              >
                <Bell size={18} />
                {isArabic ? "الإشعارات" : "Notifications"}
                {unreadCount > 0 && (
                  <span className="bg-danger text-white text-xs px-1.5 py-0.5 rounded-full mr-2">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="pt-2 mt-2 border-t border-border">
                <Link
                  href={`/${locale}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                >
                  {isArabic ? "الرئيسية" : "Home"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
