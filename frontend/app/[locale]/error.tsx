"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-danger/20 border-t-danger animate-spin" />
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
      <h1 className="text-3xl font-bold text-primary">
        {isArabic ? "حدث خطأ غير متوقع" : "Something went wrong"}
      </h1>
      <p className="text-sm text-text-secondary mt-3 max-w-md text-center">
        {isArabic
          ? "عذراً، حدث خطأ أثناء تحميل هذه الصفحة. حاول مرة أخرى."
          : "Sorry, an error occurred while loading this page. Please try again."}
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
        >
          {isArabic ? "إعادة المحاولة" : "Try again"}
        </button>
        <a
          href={`/${locale}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 border border-border text-text-secondary rounded-lg text-sm hover:bg-surface-secondary transition-colors"
        >
          {isArabic ? "العودة للرئيسية" : "Back to home"}
        </a>
      </div>
    </div>
  );
}
