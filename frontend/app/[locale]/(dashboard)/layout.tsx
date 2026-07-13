/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import NavbarDashboard from "@/components/layout/NavbarDashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  return (
    <div className="min-h-screen bg-gray-light">
      {/* Navbar العلوي بدلاً من Sidebar */}
      <NavbarDashboard isArabic={isArabic} />
      
      {/* المحتوى الرئيسي */}
      <main className="pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}