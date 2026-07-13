/* eslint-disable */
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface FooterProps {
  scrollTo?: (id: string) => void;
}

export default function Footer({ scrollTo }: FooterProps) {
  const t = useTranslations("nav");
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const handleClick = (id: string) => {
    if (scrollTo) {
      scrollTo(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-primary text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo11.jpg"
              alt="Logo"
              className="w-12 h-12 rounded-xl object-contain"
            />
            <div>
              <p className="font-bold text-lg">الوطنية للتنمية العمرانية</p>
              <p className="text-gray-300 text-sm">
                Al-Wataniya For Urban Development
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-gray-300">
            <button
              onClick={() => handleClick("services")}
              className="hover:text-gold transition-colors"
            >
              {isArabic ? "خدماتنا" : "Services"}
            </button>
            <button
              onClick={() => handleClick("projects")}
              className="hover:text-gold transition-colors"
            >
              {isArabic ? "مشاريعنا" : "Projects"}
            </button>
            <button
              onClick={() => handleClick("contact")}
              className="hover:text-gold transition-colors"
            >
              {isArabic ? "اتصل بنا" : "Contact"}
            </button>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} الوطنية للتنمية العمرانية.{" "}
          {isArabic ? "جميع الحقوق محفوظة" : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}
