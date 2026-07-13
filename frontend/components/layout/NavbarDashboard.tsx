/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
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

interface NavbarDashboardProps {
  isArabic: boolean;
}

export default function NavbarDashboard({ isArabic }: NavbarDashboardProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? "ar";

  useEffect(() => {
    setUnreadCount(3);
  }, []);

  const navItems = [
    {
      href: `/${locale}/admin`,
      icon: <LayoutDashboard size={18} />,
      label: isArabic ? "لوحة التحكم" : "Dashboard",
    },
    {
      href: `/${locale}/projects`,
      icon: <FolderKanban size={18} />,
      label: isArabic ? "المشاريع" : "Projects",
    },
    {
      href: `/${locale}/employees`,
      icon: <Briefcase size={18} />,
      label: isArabic ? "الموظفين" : "Employees",
    },
    {
      href: `/${locale}/subcontractors`,
      icon: <Users size={18} />,
      label: isArabic ? "المقاولين" : "Subcontractors",
    },
    {
      href: `/${locale}/clients`,
      icon: <Building2 size={18} />,
      label: isArabic ? "العملاء" : "Clients",
    },
    {
      href: `/${locale}/suppliers`,
      icon: <Truck size={18} />,
      label: isArabic ? "الموردين" : "Suppliers",
    },
    {
      href: `/${locale}/attendance`,
      icon: <Bell size={18} />,
      label: isArabic ? "الحضور" : "Attendance",
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <img
              src="/logo11.jpg"
              alt="Logo"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <span className="font-bold text-primary hidden sm:block">
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
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Notifications Button - شكل أكبر وأوضح */}
            <Link
              href={`/${locale}/notifications`}
              className="relative"
              suppressHydrationWarning
            >
              <button
                className="relative p-2 text-gray-500 hover:text-primary transition rounded-full hover:bg-gray-100"
                suppressHydrationWarning
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[22px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-md"
                    suppressHydrationWarning
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Home */}
            <Link
              href={`/${locale}`}
              className="text-gray-500 hover:text-primary text-sm transition-colors"
              suppressHydrationWarning
            >
              {isArabic ? "الرئيسية" : "Home"}
            </Link>
            

            {/* Logout */}
            <Link
              href={`/${locale}`}
              className="text-gray-500 hover:text-red-500 transition-colors"
              suppressHydrationWarning
            >
              <button className="text-gray-500 hover:text-red-500 transition-colors">
                <LogOut size={18} />
              </button>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
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
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                href={`/${locale}/notifications`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <Bell size={18} />
                {isArabic ? "الإشعارات" : "Notifications"}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-2">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Link
                  href={`/${locale}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
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
