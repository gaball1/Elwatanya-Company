// lib/printUtils.ts
import { renderPdf } from "@/services/pdf.service";
import { companyService, Company } from "@/services/company.service";

const escapeCell = (value: string | number): string =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PrintOptions {
  logoUrl?: string;
}

async function getDefaultLogo(): Promise<string | undefined> {
  try {
    const company: Company = await companyService.get();
    return company.smallLogo || company.logo || undefined;
  } catch {
    return undefined;
  }
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

  await renderPdf(
    {
      title,
      arabicTitle: isArabic ? title : "",
      generatedBy: "System",
      locale: isArabic ? "ar" : "en",
      sections: [{ title: "", content: tableHtml, breakInside: true }],
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

  await renderPdf(
    {
      title,
      generatedBy: "System",
      locale: isArabic ? "ar" : "en",
      sections: [{ title: "", content, breakInside: true }],
      ...(logoUrl ? { logoUrl } : {}),
    },
    filename ?? `${title}.pdf`
  );
};
