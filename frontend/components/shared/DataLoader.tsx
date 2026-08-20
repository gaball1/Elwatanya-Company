"use client";

import { useCompany } from "@/contexts/CompanyContext";

const DEFAULT_LOGO = "/logo11.jpg";

interface DataLoaderProps {
  label?: string;
  fullPage?: boolean;
  className?: string;
}

export default function DataLoader({ label, fullPage = false, className }: DataLoaderProps) {
  const { company } = useCompany();

  const logo = company?.smallLogo || company?.logo || DEFAULT_LOGO;
  const name = company?.arabicName || company?.name || "";

  const spinner = (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20">
      <div className="absolute inset-0 rounded-full border-[3px] border-gold/20 border-t-gold animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={logo}
          alt="Logo"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain bg-surface"
        />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface animate-fade-in ${className ?? ""}`}
        role="status"
        aria-label="Loading"
      >
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <div className="text-center">
            {name && <h1 className="text-lg sm:text-xl font-bold text-primary">{name}</h1>}
            <p className="text-sm text-text-secondary mt-1">{label ?? "جاري التحميل..."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 gap-4 ${className ?? ""}`}
      role="status"
      aria-label="Loading"
    >
      {spinner}
      <p className="text-sm text-text-secondary">{label ?? "جاري التحميل..."}</p>
    </div>
  );
}
