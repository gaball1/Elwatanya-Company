/* eslint-disable */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, X, Building2, Users, Package, Truck, Briefcase, FolderKanban, Loader2 } from "lucide-react";
import { searchService, type SearchResultItem } from "@/services/search.service";

const ENTITY_ICONS: Record<string, any> = {
  project: FolderKanban,
  building: Building2,
  employee: Users,
  supplier: Truck,
  subcontractor: Package,
  client: Users,
  purchase: Package,
  "inventory-item": Package,
  department: Briefcase,
  "project-fund": Package,
};

const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  project: { ar: "مشروع", en: "Project" },
  building: { ar: "مبنى", en: "Building" },
  employee: { ar: "موظف", en: "Employee" },
  supplier: { ar: "مورد", en: "Supplier" },
  subcontractor: { ar: "مقاول", en: "Subcontractor" },
  client: { ar: "عميل", en: "Client" },
  purchase: { ar: "مشتريات", en: "Purchase" },
  "inventory-item": { ar: "صنف", en: "Inventory" },
  department: { ar: "قسم", en: "Department" },
  "project-fund": { ar: "عهدة", en: "Fund" },
};

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setTotal(0);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const res = await searchService.search(q.trim());
      setResults(res.results);
      setTotal(res.total);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const handleSelect = (item: SearchResultItem) => {
    const href = `/${locale}${item.url}`;
    router.push(href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] pt-[10vh] px-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search size={20} className="text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isArabic ? "بحث عن مشروع، مبنى، موظف، مورد..." : "Search projects, buildings, employees, suppliers..."}
            className="flex-1 bg-transparent text-text-primary text-lg outline-none placeholder:text-text-muted"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              {isArabic ? "لا توجد نتائج" : "No results found"}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-1 text-xs text-text-muted">
                {isArabic ? `${total} نتيجة` : `${total} results`}
              </div>
              {results.map((item) => {
                const Icon = ENTITY_ICONS[item.entityType] || Package;
                const label = ENTITY_LABELS[item.entityType]?.[isArabic ? "ar" : "en"] || item.entityType;
                return (
                  <button
                    key={`${item.entityType}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-secondary/50 transition text-start"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary truncate">{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-text-muted">{label}</span>
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-0.5">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="text-center py-8 text-text-muted text-sm">
              {isArabic ? "اكتب حرفين على الأقل للبحث" : "Type at least 2 characters to search"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
