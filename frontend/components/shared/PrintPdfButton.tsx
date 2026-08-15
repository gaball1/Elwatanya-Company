/* eslint-disable */
"use client";

import { useState, useRef, useCallback } from "react";
import { Printer, Upload, Image as ImageIcon } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { companyService, Company } from "@/services/company.service";

export interface PrintPdfButtonProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onPrint: (logoUrl?: string) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Print button that opens a professional logo-selection dialog before
 * generating the PDF. The selected logo (or the configured company branding
 * logo) is passed to the PDF engine so the generated document actually uses it.
 */
export default function PrintPdfButton({
  label,
  className,
  size = "md",
  onPrint,
  disabled,
}: PrintPdfButtonProps) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = useCallback(async () => {
    setError("");
    setSelected("");
    setCustomPreview(null);
    try {
      const c = await companyService.get();
      setCompany(c);
      setSelected(c.smallLogo || c.logo || "");
    } catch {
      setCompany(null);
    }
    setOpen(true);
  }, []);

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
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const logoOptions = [
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
            Select the logo to use on this document, or upload a different one for this print.
          </p>

          {logoOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary">Existing company logos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {logoOptions.map((opt) => (
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

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary">Upload a different logo</label>
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
                Choose image
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirm} loading={loading}>Generate PDF</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
