import { renderPdf } from "@/services/pdf.service";
import { companyService, Company } from "@/services/company.service";

async function getDefaultLogo(): Promise<string | undefined> {
  try {
    const company: Company = await companyService.get();
    return company.smallLogo || company.logo || undefined;
  } catch {
    return undefined;
  }
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
  options: { logoUrl?: string } = {}
) {
  const content = `${extraStyles ? `<style>${extraStyles}</style>` : ""}${bodyHtml}`;
  const logoUrl = options.logoUrl || (await getDefaultLogo());
  await renderPdf(
    {
      title,
      generatedBy: "System",
      sections: [{ title: "", content, breakInside: true }],
      ...(logoUrl ? { logoUrl } : {}),
    },
    `${title}.pdf`
  );
}
