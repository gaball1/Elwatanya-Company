/* eslint-disable */
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import {
  Building2,
  MapPin,
  Calendar,
  ChevronLeft,
  DollarSign,
  TrendingUp,
  Warehouse,
  ShoppingCart,
  PieChart,
  Coffee,
  FileEdit,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { projectService } from '@/services/project.service';

export default function ProjectTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    projectService.getProjects().then(setProjects).catch(console.error);
  }, []);
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projectId, projects]);

  const tabs = useMemo(
    () => [
      {
        id: "dashboard",
        href: `/${locale}/projects/${projectId}/dashboard`,
        label: isArabic ? "لوحة التحكم" : "Dashboard",
        icon: <LayoutDashboard size={18} />,
        exact: false,
      },
      {
        id: "buildings",
        href: `/${locale}/projects/${projectId}/buildings`,
        label: isArabic ? "المباني" : "Buildings",
        icon: <Building2 size={18} />,
        exact: true,
      },
      {
        id: "treasury",
        href: `/${locale}/projects/${projectId}/treasury`,
        label: isArabic ? "الخزنة" : "Treasury",
        icon: <DollarSign size={18} />,
        exact: false,
      },
      {
        id: "purchases",
        href: `/${locale}/projects/${projectId}/purchases`,
        label: isArabic ? "المشتريات" : "Purchases",
        icon: <ShoppingCart size={18} />,
        exact: false,
      },
      // أضف التب الجديد في tabs array
      {
        id: "miscellaneous",
        href: `/${locale}/projects/${projectId}/miscellaneous`,
        label: isArabic ? "النثريات" : "Miscellaneous",
        icon: <Coffee size={18} />,
        exact: false,
      },
      {
        id: "inventory",
        href: `/${locale}/projects/${projectId}/inventory`,
        label: isArabic ? "المخازن" : "Inventory",
        icon: <Warehouse size={18} />,
        exact: false,
      },
      {
        id: "analytics",
        href: `/${locale}/projects/${projectId}/analytics`,
        label: isArabic ? "تحليل البيانات" : "Analytics",
        icon: <PieChart size={18} />,
        exact: false,
      },
      {
        id: "change-orders",
        href: `/${locale}/projects/${projectId}/change-orders`,
        label: isArabic ? "أوامر التغيير" : "Change Orders",
        icon: <FileEdit size={18} />,
        exact: false,
      },
    ],
    [isArabic, locale, projectId]
  );

  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname?.startsWith(href + "/");

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">
          {isArabic ? "المشروع غير موجود" : "Project not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/projects`}
            className="text-text-muted hover:text-gold transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-gold" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-gold" />
                <span>
                  {isArabic ? "بداية:" : "Start:"}{" "}
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString(isArabic ? "ar-EG" : "en-US")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className="text-gold" />
                <span>
                  {isArabic ? "إنجاز:" : "Progress:"} {project.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            {isArabic ? "نسبة الإنجاز" : "Progress"}
          </span>
          <div className="flex-1 max-w-md">
            <div className="w-full bg-surface-tertiary rounded-full h-2">
              <div
                className="bg-gold rounded-full h-2"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold text-primary">
            {project.progress}%
          </span>
        </div>
      </div>

      <div className="bg-surface border-b border-border px-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive(tab.href, tab.exact)
                  ? "border-gold text-gold"
                  : "border-transparent text-text-muted hover:text-gold"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}
