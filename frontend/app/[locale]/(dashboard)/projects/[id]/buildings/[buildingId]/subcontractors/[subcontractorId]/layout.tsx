/* eslint-disable */
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { mockSubcontractors } from "@/lib/mockData";
import { FileText, DollarSign, Wallet } from "lucide-react";

export default function SubcontractorLayout({
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
  const subcontractorId = params.subcontractorId as string;
  const sub = mockSubcontractors.find((s) => s.id === subcontractorId);
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${subcontractorId}`;

  const tabs = [
    {
      href: `${base}/estimate`,
      label: isArabic ? "المقايسة" : "BOQ",
      icon: FileText,
    },
    {
      href: `${base}/extracts`,
      label: isArabic ? "المستخلصات" : "Extracts",
      icon: DollarSign,
    },
    {
      href: `${base}/payments`,
      label: isArabic ? "الدفعات" : "Payments",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header - نفس أسلوبك الأصلي */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <Link
          href={`/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors`}
          className="text-sm text-gray-500 hover:text-primary transition inline-flex items-center gap-1"
        >
          ← {isArabic ? "المقاولين" : "Subcontractors"}
        </Link>
        <h2 className="text-xl font-bold text-primary mt-1">{sub?.name}</h2>
      </div>

      {/* Tabs - نفس أسلوبك الأصلي */}
      <div className="bg-white px-4 py-2 rounded-xl shadow-sm">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 py-2 border-b-2 whitespace-nowrap ${
                pathname?.startsWith(t.href)
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-500 hover:text-primary"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content - نفس أسلوبك الأصلي مع إضافة padding */}
      <div className="bg-white rounded-xl shadow-sm p-4 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
