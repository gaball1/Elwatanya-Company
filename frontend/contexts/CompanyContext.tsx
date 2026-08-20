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

  const fetchCompany = useCallback(async () => {
    try {
      const data = await companyService.get();
      setCompany(data);
    } catch {
      // silently fail — will retry on next mount
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return (
    <CompanyContext.Provider value={{ company, loading, refresh: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}
