import { API_BASE_URL } from "@/lib/api/env";
import { getAccessToken } from "@/lib/api/tokenStorage";

export interface PdfSection {
  title?: string;
  content: string;
  columns?: number;
  breakInside?: boolean;
}

export interface PdfSignature {
  label: string;
  name?: string;
  imageUrl?: string;
  date?: string;
}

export interface PdfDocumentDefinition {
  title: string;
  arabicTitle?: string;
  documentNumber?: string;
  version?: string;
  generatedBy?: string;
  generatedAt?: string;
  sections?: PdfSection[];
  signatures?: PdfSignature[];
  watermark?: string;
  orientation?: "portrait" | "landscape";
  pageSize?: string;
  qrData?: string;
  locale?: "ar" | "en";
  logoUrl?: string;
}

export async function renderPdf(
  doc: PdfDocumentDefinition,
  filename?: string
): Promise<void> {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const token = getAccessToken();

  const response = await fetch(`${baseUrl}/pdf/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(doc),
  });

  if (!response.ok) {
    throw new Error("PDF generation failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `${doc.title}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
