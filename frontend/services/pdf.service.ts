import { API_BASE_URL } from "@/lib/api/env";
import { getAccessToken } from "@/lib/api/tokenStorage";
import { safeFetch } from "@/lib/api/fetchTransport";

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

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data === "object" && data !== null) {
      const message = (data as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string" && message.length > 0) return message;
    }
  } catch {
    // ignore non-JSON error bodies
  }
  return `PDF generation failed (HTTP ${response.status})`;
}

export async function renderPdf(
  doc: PdfDocumentDefinition,
  filename?: string
): Promise<void> {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const token = getAccessToken();

  const response = await safeFetch(`${baseUrl}/pdf/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(doc),
  });

  if (!response.ok) {
    throw new Error(await parseErrorBody(response));
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/pdf")) {
    throw new Error(
      `PDF generation failed: expected application/pdf but received ${contentType || "an unknown content type"}`
    );
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("PDF generation failed: the server returned an empty file");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `${doc.title}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
