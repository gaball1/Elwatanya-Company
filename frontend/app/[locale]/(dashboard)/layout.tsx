/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import dynamic from "next/dynamic";
const AiAgentChat = dynamic(() => import("@/components/ai-agent/AiAgentChat"), { ssr: false });
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/useAuth";
import DataLoader from "@/components/shared/DataLoader";
import { CompanyProvider } from "@/contexts/CompanyContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { user } = useUser();
  const { loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const userPermissions = user?.permissions ?? [];
  const userRoleNames = user?.roleNames ?? [];

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved) setSidebarCollapsed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${locale}/login`);
    }
  }, [authLoading, user, router, locale]);

  if (authLoading || !user) {
    return <DataLoader fullPage />;
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("sidebar_collapsed", JSON.stringify(!prev));
      return !prev;
    });
  };

  return (
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          isArabic={isArabic}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          userPermissions={userPermissions}
          userRoleNames={userRoleNames}
          userEmployeeId={user?.employeeId ?? null}
        />
        {mobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}
        <div
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "mr-[var(--sidebar-collapsed-width)]" : "mr-[var(--sidebar-width)]"
          )}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <Topbar isArabic={isArabic} onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
          <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
        </div>
        <AiAgentChat />
      </div>
    </CompanyProvider>
  );
}
