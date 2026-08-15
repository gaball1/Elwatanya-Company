"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotFound() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-gold/20 border-t-gold" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/logo11.jpg"
            alt="Company logo"
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-contain bg-surface shadow-sm"
          />
        </div>
      </div>
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-lg text-text-secondary mt-3">
        {isArabic ? "الصفحة غير موجودة" : "Page not found"}
      </p>
      <p className="text-sm text-text-muted mt-2 max-w-md text-center">
        {isArabic
          ? "عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها."
          : "Sorry, the page you are looking for does not exist or has been moved."}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
      >
        {isArabic ? "العودة للرئيسية" : "Back to home"}
      </Link>
    </div>
  );
}
