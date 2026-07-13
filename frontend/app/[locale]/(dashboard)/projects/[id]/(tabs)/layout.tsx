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
} from "lucide-react";
import { mockProjects } from "@/lib/mockData";

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

  const project = useMemo(
    () => mockProjects.find((p) => p.id === projectId),
    [projectId]
  );

  const tabs = useMemo(
    () => [
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
        <p className="text-gray-500">
          {isArabic ? "المشروع غير موجود" : "Project not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-light">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/projects`}
            className="text-gray-500 hover:text-primary transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-gold" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-gold" />
                <span>
                  {isArabic ? "بداية:" : "Start:"} {project.startDate}
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

      <div className="bg-white px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {isArabic ? "نسبة الإنجاز" : "Progress"}
          </span>
          <div className="flex-1 max-w-md">
            <div className="w-full bg-gray-200 rounded-full h-2">
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

      <div className="bg-white border-b px-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive(tab.href, tab.exact)
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-500 hover:text-primary"
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
