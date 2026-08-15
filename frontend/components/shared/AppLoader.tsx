"use client";

import { useEffect, useState } from "react";
import { companyService } from "@/services/company.service";

const DEFAULT_LOGO = "/logo11.jpg";
const DEFAULT_NAME = "الوطنية للتنمية العمرانية";

interface CompanyBrand {
  logo: string;
  name: string;
}

let cachedBrand: CompanyBrand | null = null;

async function resolveCompanyBrand(): Promise<CompanyBrand> {
  if (cachedBrand) return cachedBrand;
  try {
    const company = await companyService.get();
    cachedBrand = {
      logo: company.smallLogo || company.logo || "",
      name: company.arabicName || company.name || "",
    };
  } catch {
    cachedBrand = { logo: "", name: "" };
  }
  return cachedBrand;
}

interface AppLoaderProps {
  label?: string;
}

export default function AppLoader({ label }: AppLoaderProps) {
  const [brand, setBrand] = useState<CompanyBrand>(() => ({
    logo: cachedBrand?.logo || DEFAULT_LOGO,
    name: cachedBrand?.name || DEFAULT_NAME,
  }));

  useEffect(() => {
    if (cachedBrand) return;
    let mounted = true;
    resolveCompanyBrand().then((resolved) => {
      if (!mounted) return;
      if (resolved.logo || resolved.name) {
        setBrand((prev) => ({
          logo: resolved.logo || prev.logo,
          name: resolved.name || prev.name,
        }));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface animate-fade-in"
      aria-label="Loading"
      role="status"
    >
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24">
          <div className="absolute inset-0 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={brand.logo}
              alt="Company logo"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-contain bg-surface shadow-sm"
            />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">{brand.name}</h1>
          <p className="text-sm text-text-secondary mt-2">{label ?? "جاري التحميل..."}</p>
        </div>
      </div>
    </div>
  );
}
