"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { companyService, type Company } from "@/services/company.service";

interface CompanyContextValue {
  company: Company | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  loading: true,
  refresh: async () => {},
});

export function useCompany() {
  return useContext(CompanyContext);
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await companyService.get();
        if (!cancelled) setCompany(data);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const fetchCompany = useCallback(async () => {
    try {
      const data = await companyService.get();
      setCompany(data);
    } catch {
      // silently fail
    }
  }, []);

  return (
    <CompanyContext.Provider value={{ company, loading, refresh: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}
