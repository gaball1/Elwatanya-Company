/* eslint-disable */
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, DollarSign, Wallet } from "lucide-react";
import { buildingSubcontractorService } from "@/services/building-subcontractor.service";
import { shortRef } from "@/lib/formatRef";

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
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${subcontractorId}`;
  const [contractorName, setContractorName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    buildingSubcontractorService
      .listByBuilding(buildingId)
      .then((items) => {
        if (!mounted) return;
        const hit = items.find((a) => a.subcontractorId === subcontractorId);
        setContractorName(hit?.subcontractor?.name ?? null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [buildingId, subcontractorId]);

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
      <div className="bg-surface p-4 rounded-xl shadow-card border border-border">
        <Link
          href={`/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors`}
          className="text-sm text-text-muted hover:text-gold transition inline-flex items-center gap-1"
        >
          ← {isArabic ? "المقاولين" : "Subcontractors"}
        </Link>
        <h2 className="text-xl font-bold text-primary mt-1">
          {contractorName
            ? contractorName
            : `${isArabic ? "مقاول" : "Subcontractor"} ${shortRef(subcontractorId)}`}
        </h2>
      </div>

      <div className="bg-surface px-4 py-2 rounded-xl shadow-card border border-border">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 py-2 border-b-2 whitespace-nowrap ${
                pathname?.startsWith(t.href)
                  ? "border-gold text-gold"
                  : "border-transparent text-text-muted hover:text-gold"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border p-4 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
