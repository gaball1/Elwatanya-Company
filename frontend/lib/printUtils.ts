// lib/printUtils.ts
import { renderPdf } from "@/services/pdf.service";
import { companyService, Company } from "@/services/company.service";

const escapeCell = (value: string | number): string =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PrintOptions {
  logoUrl?: string;
  subtitle?: string;
  documentNumber?: string;
  signatures?: { label: string; name?: string; date?: string; imageUrl?: string }[];
}

let cachedCompany: Company | null = null;

async function getCompany(): Promise<Company> {
  if (!cachedCompany) {
    try { cachedCompany = await companyService.get(); } catch { /* ignore */ }
  }
  return cachedCompany!;
}

export async function getDefaultLogo(): Promise<string | undefined> {
  const company = await getCompany();
  return company?.smallLogo || company?.logo || undefined;
}

export async function getCompanyName(): Promise<string> {
  const company = await getCompany();
  return company?.arabicName || company?.name || "Al-Wataniya";
}

export const printAsPDF = async (
  data: (string | number)[][],
  headers: string[],
  title: string,
  isArabic: boolean,
  options: PrintOptions = {}
) => {
  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map((h) => `<th>${escapeCell(h)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  const logoUrl = options.logoUrl || (await getDefaultLogo());
  const companyName = await getCompanyName();

  await renderPdf(
    {
      title,
      arabicTitle: isArabic ? title : "",
      generatedBy: companyName,
      locale: isArabic ? "ar" : "en",
      sections: [{ title: "", content: tableHtml, breakInside: true }],
      ...(options.subtitle ? { arabicTitle: options.subtitle } : {}),
      ...(options.documentNumber ? { documentNumber: options.documentNumber } : {}),
      ...(options.signatures ? { signatures: options.signatures } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
    `${title}.pdf`
  );
};

export const printHtmlDocument = async (
  title: string,
  htmlContent: string,
  filename?: string,
  options: PrintOptions = {},
  isArabic = true
) => {
  const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
  const content = `${styleMatch ? `<style>${styleMatch[1]}</style>` : ""}${
    bodyMatch ? bodyMatch[1] : htmlContent
  }`;

  const logoUrl = options.logoUrl || (await getDefaultLogo());
  const companyName = await getCompanyName();

  await renderPdf(
    {
      title,
      arabicTitle: options.subtitle || "",
      generatedBy: companyName,
      locale: isArabic ? "ar" : "en",
      sections: [{ title: "", content, breakInside: true }],
      ...(options.documentNumber ? { documentNumber: options.documentNumber } : {}),
      ...(options.signatures ? { signatures: options.signatures } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
    filename ?? `${title}.pdf`
  );
};
