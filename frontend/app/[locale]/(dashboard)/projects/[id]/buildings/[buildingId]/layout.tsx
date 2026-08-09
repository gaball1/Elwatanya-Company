/* eslint-disable */
"use client";

import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  FileText,
  Users,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import { buildingService } from "@/services/building.service";

export default function BuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;

  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    if (buildingId && projectId) {
      buildingService.getBuilding(buildingId).then(setBuilding).catch(console.error);
    }
  }, [buildingId, projectId]);

  const tabs = useMemo(
    () => [
      {
        id: "estimates",
        href: `/${locale}/projects/${projectId}/buildings/${buildingId}/estimates`,
        label: isArabic ? "المقايسات" : "Estimates",
        icon: <FileText size={18} />,
      },
      {
        id: "subcontractors",
        href: `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors`,
        label: isArabic ? "المقاولين" : "Subcontractors",
        icon: <Users size={18} />,
        exact: false,
      },
      {
        id: "client-statements",
        href: `/${locale}/projects/${projectId}/buildings/${buildingId}/client-statements`,
        label: isArabic ? "مستخلصات جهة الإسناد" : "Client Statements",
        icon: <DollarSign size={18} />,
      },
      {
        id: "boards",
        href: `/${locale}/projects/${projectId}/buildings/${buildingId}/boards`,
        label: isArabic ? "لوحات المشروع" : "Project Boards",
        icon: <ImageIcon size={18} />,
      },
    ],
    [isArabic, locale, projectId, buildingId]
  );

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname?.startsWith(href + "/");

  if (!building) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">
          {isArabic ? "المبنى غير موجود" : "Building not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/projects/${projectId}/buildings`}
            className="text-text-muted hover:text-gold transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Building2 size={24} className="text-gold" />
              <h1 className="text-2xl font-bold text-primary">{building.name}</h1>
              <span className="text-sm bg-surface-tertiary px-2 py-1 rounded-full text-text-secondary">
                {building.code}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b border-border px-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab: any) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors whitespace-nowrap ${
                isActive(tab.href, tab.id === "subcontractors")
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
