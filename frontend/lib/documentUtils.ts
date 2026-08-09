import { renderPdf } from "@/services/pdf.service";

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
}

export async function printHtml(
  title: string,
  bodyHtml: string,
  extraStyles: string = ""
) {
  const content = `${extraStyles ? `<style>${extraStyles}</style>` : ""}${bodyHtml}`;
  await renderPdf(
    {
      title,
      generatedBy: "System",
      sections: [{ title: "", content, breakInside: true }],
    },
    `${title}.pdf`
  );
}
