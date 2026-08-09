// lib/printUtils.ts
import { renderPdf, PdfDocumentDefinition } from "@/services/pdf.service";

const escapeCell = (value: string | number): string =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const printAsPDF = async (
  data: (string | number)[][],
  headers: string[],
  title: string,
  isArabic: boolean
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

  await renderPdf(
    {
      title,
      arabicTitle: isArabic ? title : "",
      generatedBy: "System",
      locale: isArabic ? "ar" : "en",
      sections: [{ title: "", content: tableHtml, breakInside: true }],
    },
    `${title}.pdf`
  );
};

export const printHtmlDocument = async (
  title: string,
  htmlContent: string,
  filename?: string
) => {
  const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
  const content = `${styleMatch ? `<style>${styleMatch[1]}</style>` : ""}${
    bodyMatch ? bodyMatch[1] : htmlContent
  }`;

  await renderPdf(
    {
      title,
      generatedBy: "System",
      sections: [{ title: "", content, breakInside: true }],
    },
    filename ?? `${title}.pdf`
  );
};
