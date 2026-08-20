/* eslint-disable */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Printer, Upload, Image as ImageIcon, Clock, Trash2 } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useCompany } from "@/contexts/CompanyContext";

const RECENT_LOGOS_KEY = "elwataniya_recent_logos";
const MAX_RECENT = 5;

function loadRecentLogos(): { label: string; value: string }[] {
  try {
    const raw = localStorage.getItem(RECENT_LOGOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any) => item && typeof item.value === "string" && item.value.length > 0
    );
  } catch {
    return [];
  }
}

function saveRecentLogo(url: string) {
  if (!url || url.startsWith("data:")) return;
  try {
    const recent = loadRecentLogos().filter((r) => r.value !== url);
    recent.unshift({ label: url.split("/").pop() || "Logo", value: url });
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    localStorage.setItem(RECENT_LOGOS_KEY, JSON.stringify(recent));
  } catch {
    // ignore quota errors
  }
}

export interface PrintPdfButtonProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onPrint: (logoUrl?: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function PrintPdfButton({
  label,
  className,
  size = "md",
  onPrint,
  disabled,
}: PrintPdfButtonProps) {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [recentLogos, setRecentLogos] = useState<{ label: string; value: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = useCallback(() => {
    setError("");
    setSelected(company?.smallLogo || company?.logo || "");
    setCustomPreview(null);
    setRecentLogos(loadRecentLogos());
    setOpen(true);
  }, [company]);

  useEffect(() => {
    setRecentLogos(loadRecentLogos());
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError("Please select a PNG, JPG, SVG, or WebP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomPreview(ev.target?.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      const logoUrl = customPreview || selected || undefined;
      await onPrint(logoUrl);
      if (logoUrl) saveRecentLogo(logoUrl);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const removeRecent = (value: string) => {
    const updated = recentLogos.filter((r) => r.value !== value);
    setRecentLogos(updated);
    try {
      localStorage.setItem(RECENT_LOGOS_KEY, JSON.stringify(updated));
    } catch {}
    if (selected === value) {
      setSelected(company?.smallLogo || company?.logo || "");
    }
  };

  const companyOptions = [
    ...(company?.smallLogo ? [{ label: "الشعار المصغر / Small Logo", value: company.smallLogo }] : []),
    ...(company?.logo ? [{ label: "الشعار الرئيسي / Main Logo", value: company.logo }] : []),
  ];

  const activePreview = customPreview || selected;

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        onClick={openDialog}
        disabled={disabled}
        icon={<Printer size={size === "sm" ? 14 : 18} />}
        className={className}
      >
        {label || "Print PDF"}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Print PDF - Logo Selection" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            اختر الشعار المستند أو ارفع شعار جديد
          </p>

          {companyOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary">شعارات الشركة</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelected(opt.value); setCustomPreview(null); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                      !customPreview && selected === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg border border-border bg-surface-secondary flex items-center justify-center overflow-hidden">
                      <img src={opt.value} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-text-secondary">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentLogos.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Clock size={12} />
                شعارات مستخدمة سابقاً
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentLogos.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelected(opt.value); setCustomPreview(null); }}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                      !customPreview && selected === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-surface-secondary"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg border border-border bg-surface-secondary flex items-center justify-center overflow-hidden">
                      <img src={opt.value} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-text-secondary truncate flex-1 text-left">{opt.label}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeRecent(opt.value); }}
                      className="absolute top-1 left-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-danger/10 transition-opacity"
                      title="إزالة"
                    >
                      <Trash2 size={12} className="text-danger" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary">رفع شعار جديد</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-surface-secondary flex items-center justify-center overflow-hidden">
                {activePreview ? (
                  <img src={activePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon size={24} className="text-text-muted" />
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFile}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} icon={<Upload size={14} />}>
                اختر صورة
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={confirm} loading={loading}>إنشاء PDF</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
