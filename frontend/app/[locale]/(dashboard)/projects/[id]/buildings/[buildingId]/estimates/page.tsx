/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";

const cards = [
  {
    key: "client",
    href: (l: string, p: string, b: string) =>
      `/${l}/projects/${p}/buildings/${b}/estimates/client`,
    titleAr: "مقايسة جهة الإسناد",
    titleEn: "Employer BOQ",
    descAr: "المصدر الرئيسي للبنود (كود، وصف، وحدة، كمية، فئة)",
    descEn: "Main BOQ source with item codes",
    color: "text-primary",
  },
  {
    key: "company",
    href: (l: string, p: string, b: string) =>
      `/${l}/projects/${p}/buildings/${b}/estimates/company`,
    titleAr: "المقايسة التحليلية",
    titleEn: "Analytical BOQ",
    descAr: "تعتمد على بنود جهة الإسناد",
    descEn: "Derived from employer BOQ",
    color: "text-gold",
  },
  {
    key: "final",
    href: (l: string, p: string, b: string) =>
      `/${l}/projects/${p}/buildings/${b}/estimates/final`,
    titleAr: "المقايسة النهائية",
    titleEn: "Final BOQ",
    descAr: "الكمية المتبقية وتتبع التوزيع على المقاولين",
    descEn: "Remaining qty & contractor allocation",
    color: "text-primary",
  },
];

export default function BuildingEstimatesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <Link key={c.key} href={c.href(locale, projectId, buildingId)} className="block">
          <Card hover className="p-6 text-center cursor-pointer group h-full">
            <FileText size={40} className={`mx-auto mb-4 ${c.color}`} />
            <h3 className="text-lg font-bold text-primary mb-2">
              {isArabic ? c.titleAr : c.titleEn}
            </h3>
            <p className="text-gray-500 text-sm mb-3">
              {isArabic ? c.descAr : c.descEn}
            </p>
            <span className="inline-flex items-center gap-1 text-gold text-sm">
              {isArabic ? "فتح" : "Open"}
              <ChevronRight size={16} className="rotate-180" />
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
