"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

export interface UploadedFileInfo {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface UploadFromDeviceButtonProps {
  isArabic: boolean;
  onUpload: (file: UploadedFileInfo) => void;
  accept?: string;
  label?: string;
  variant?: "primary" | "outline";
  className?: string;
}

const DEFAULT_ACCEPT = ".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.webp";

export default function UploadFromDeviceButton({
  isArabic,
  onUpload,
  accept = DEFAULT_ACCEPT,
  label,
  variant = "outline",
  className = "",
}: UploadFromDeviceButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpload({
      name: file.name,
      url,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });

    e.target.value = "";
  };

  // ✅ استخدام ألوان ثابتة بدل Tailwind classes
  const baseStyles =
    variant === "primary"
      ? "bg-[#1e3a5f] text-white hover:bg-[#15304d]"
      : "border-2 border-[#c9a03d] text-[#c9a03d] hover:bg-[#c9a03d] hover:text-white";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${baseStyles} ${className}`}
      >
        <Upload size={18} />
        {label ?? (isArabic ? "رفع من الجهاز" : "Upload from Device")}
      </button>
    </>
  );
}
