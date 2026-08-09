// lib/boqExcel.ts
// Client-side Excel (.xlsx) import/export for BOQ item lists.

import ExcelJS from "exceljs";

export interface BoqImportRow {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : 0;
  const n = Number(String(value ?? "").trim().replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function toTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Parse the first worksheet of an .xlsx buffer.
 * Supports both a header row (Description | Unit | Quantity | UnitPrice,
 * with Arabic aliases) and headerless rows matching the CSV layout
 * (description, unit, quantity, unitPrice).
 */
export async function parseBoqExcelFile(file: File): Promise<BoqImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerAliases = new Map<string, keyof BoqImportRow>([
    ["description", "description"],
    ["desc", "description"],
    ["الوصف", "description"],
    ["البند", "description"],
    ["item", "description"],
    ["unit", "unit"],
    ["وحدة", "unit"],
    ["الوحدة", "unit"],
    ["quantity", "quantity"],
    ["qty", "quantity"],
    ["كمية", "quantity"],
    ["الكمية", "quantity"],
    ["unitprice", "unitPrice"],
    ["price", "unitPrice"],
    ["فئة", "unitPrice"],
    ["السعر", "unitPrice"],
  ]);

  const rows: BoqImportRow[] = [];
  const rawRows: string[][] = [];

  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    // exceljs values are 1-indexed; slice(1) drops the leading index.
    const cells = values.slice(1).map((v) => (v && typeof v === "object" && "result" in (v as object) ? (v as { result: unknown }).result : v));
    rawRows.push(cells.map(toTrimmedString));
  });

  if (rawRows.length === 0) return rows;

  // Detect a header row: first row where any cell matches a known alias.
  const first = rawRows[0];
  const headerIndices = first.map((cell) => headerAliases.get(cell.toLowerCase()));
  const hasHeader = headerIndices.some((idx) => idx !== undefined);

  const body = hasHeader ? rawRows.slice(1) : rawRows;

  for (const cells of body) {
    let description: string;
    let unit: string;
    let quantity: number;
    let unitPrice: number;

    if (hasHeader) {
      const get = (key: keyof BoqImportRow): string | undefined => {
        const colIndex = headerIndices.indexOf(key);
        return colIndex >= 0 ? cells[colIndex] : undefined;
      };
      description = get("description") ?? "";
      unit = get("unit") ?? "";
      quantity = toFiniteNumber(get("quantity"));
      unitPrice = toFiniteNumber(get("unitPrice"));
    } else {
      description = cells[0] ?? "";
      unit = cells[1] ?? "";
      quantity = toFiniteNumber(cells[2]);
      unitPrice = toFiniteNumber(cells[3]);
    }

    if (!description) continue;
    rows.push({
      description,
      unit: unit || "م³",
      quantity,
      unitPrice,
    });
  }

  return rows;
}

export interface BoqExcelRow {
  itemCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export async function exportBoqToExcel(
  items: BoqExcelRow[],
  filename: string,
  headers: string[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Elwataniya ERP";
  const sheet = workbook.addWorksheet("Employer BOQ");

  sheet.columns = headers.map((header) => ({ header, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F3864" },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(2, items.length + 1), column: headers.length } };

  items.forEach((item) => {
    sheet.addRow([
      item.itemCode ?? "",
      item.description,
      item.unit,
      item.quantity,
      item.unitPrice,
      item.totalValue,
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
