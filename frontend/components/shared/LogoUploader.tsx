/* eslint-disable */
"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const LOGO_KEY = "elwataniya_company_logo";

export default function LogoUploader() {
  const [logo, setLogo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOGO_KEY);
    if (saved) setLogo(saved);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      alert("Please select a PNG, JPG, SVG, or WebP image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const saveLogo = () => {
    if (preview) {
      localStorage.setItem(LOGO_KEY, preview);
      setLogo(preview);
      setPreview(null);
    }
  };

  const removeLogo = () => {
    localStorage.removeItem(LOGO_KEY);
    setLogo(null);
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Company Logo</h3>
      <p className="text-xs text-text-muted">
        Used on all printed documents (BOQs, statements, reports).
      </p>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-surface-secondary">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          ) : logo ? (
            <img src={logo} alt="Company logo" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon size={28} className="text-text-muted" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFile}
            className="hidden"
          />
          {preview ? (
            <div className="flex gap-2">
              <button onClick={saveLogo} className="px-3 py-1.5 bg-gold text-white text-xs rounded-lg hover:bg-gold-dark transition-colors">
                Save Logo
              </button>
              <button onClick={() => setPreview(null)} className="px-3 py-1.5 border border-border text-text-secondary text-xs rounded-lg hover:bg-surface-secondary transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-dark transition-colors">
              <Upload size={14} /> Choose Image
            </button>
          )}
          {logo && !preview && (
            <button onClick={removeLogo} className="flex items-center gap-1 text-xs text-danger hover:text-danger-dark transition-colors">
              <X size={12} /> Remove Logo
            </button>
          )}
        </div>
      </div>

      {/* Hidden rendered logo for print */}
      {logo && (
        <div className="hidden print:block absolute top-0 left-0 p-6">
          <img src={logo} alt="Company Logo" className="h-16 w-auto object-contain" />
        </div>
      )}
    </div>
  );
}

export function getCompanyLogo(): string | null {
  return localStorage.getItem(LOGO_KEY);
}
