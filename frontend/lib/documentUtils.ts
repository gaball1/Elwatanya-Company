import { renderPdf } from "@/services/pdf.service";
import { companyService, Company } from "@/services/company.service";

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

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const escape = (value: string | number) => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
}

export async function printHtml(
  title: string,
  bodyHtml: string,
  extraStyles: string = "",
  options: { logoUrl?: string; subtitle?: string; documentNumber?: string; signatures?: { label: string; name?: string; date?: string; imageUrl?: string }[] } = {}
) {
  const content = `${extraStyles ? `<style>${extraStyles}</style>` : ""}${bodyHtml}`;
  const logoUrl = options.logoUrl || (await getDefaultLogo());
  const companyName = await getCompanyName();
  await renderPdf(
    {
      title,
      arabicTitle: options.subtitle || "",
      generatedBy: companyName,
      documentNumber: options.documentNumber,
      sections: [{ title: "", content, breakInside: true }],
      ...(options.signatures ? { signatures: options.signatures } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
    `${title}.pdf`
  );
}
