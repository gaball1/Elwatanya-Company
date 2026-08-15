// lib/boqExcel.ts
// Client-side Excel (.xlsx) import/export for BOQ item lists.

import ExcelJS from "exceljs";

export interface BoqImportRow {
  itemCode?: string;
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

  type HeaderKey = keyof BoqImportRow | "totalValue";

  const headerAliases = new Map<string, HeaderKey>([
    ["itemcode", "itemCode"],
    ["code", "itemCode"],
    ["الكود", "itemCode"],
    ["كود البند", "itemCode"],
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
    ["سعر الوحدة", "unitPrice"],
    ["سعر", "unitPrice"],
    ["السعر", "unitPrice"],
    ["فئة", "unitPrice"],
    ["الفئة", "unitPrice"],
    ["قيمة", "totalValue"],
    ["القيمة", "totalValue"],
    ["value", "totalValue"],
    ["total", "totalValue"],
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
    let itemCode: string | undefined;
    let description: string;
    let unit: string;
    let quantity: number;
    let unitPrice: number;

    if (hasHeader) {
      const get = (key: HeaderKey): string | undefined => {
        const colIndex = headerIndices.indexOf(key);
        return colIndex >= 0 ? cells[colIndex] : undefined;
      };
      itemCode = get("itemCode") || undefined;
      description = get("description") ?? "";
      unit = get("unit") ?? "";
      quantity = toFiniteNumber(get("quantity"));
      unitPrice = toFiniteNumber(get("unitPrice"));
      const totalValue = toFiniteNumber(get("totalValue"));
      if (unitPrice <= 0 && totalValue > 0 && quantity > 0) {
        unitPrice = totalValue / quantity;
      }
    } else {
      itemCode = cells[0] || undefined;
      description = cells[1] ?? "";
      unit = cells[2] ?? "";
      quantity = toFiniteNumber(cells[3]);
      unitPrice = toFiniteNumber(cells[4]);
    }

    if (!description) continue;
    rows.push({
      itemCode,
      description,
      unit: unit || "م³",
      quantity,
      unitPrice,
    });
  }

  return rows;
}

export interface ExtractImportRow {
  itemCode?: string;
  description: string;
  unit: string;
  previous: number;
  current: number;
}

/**
 * Parse an extract .xlsx (e.g. a file produced by exportExtractToExcel) into
 * extract item rows. Recognizes the extract column layout — م، كود، البيان،
 * الوحدة، سابق، حالي، إجمالي، منفذ، القيمة — via Arabic/English header
 * aliases, tolerating a title/subtitle block above the header row and skipping
 * summary/section rows.
 */
export async function parseExtractExcelFile(file: File): Promise<ExtractImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  type HeaderKey = keyof ExtractImportRow;

  const headerAliases = new Map<string, HeaderKey>([
    ["itemcode", "itemCode"],
    ["code", "itemCode"],
    ["الكود", "itemCode"],
    ["كود", "itemCode"],
    ["description", "description"],
    ["desc", "description"],
    ["البيان", "description"],
    ["البند", "description"],
    ["الوصف", "description"],
    ["unit", "unit"],
    ["وحدة", "unit"],
    ["الوحدة", "unit"],
    ["previous", "previous"],
    ["prev", "previous"],
    ["سابق", "previous"],
    ["السابق", "previous"],
    ["current", "current"],
    ["now", "current"],
    ["حالي", "current"],
    ["الحالي", "current"],
    ["هذا الشهر", "current"],
  ]);

  const rows: ExtractImportRow[] = [];
  const rawRows: string[][] = [];

  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    const cells = values.slice(1).map((v) =>
      v && typeof v === "object" && "result" in (v as object)
        ? (v as { result: unknown }).result
        : v
    );
    rawRows.push(cells.map(toTrimmedString));
  });

  if (rawRows.length === 0) return rows;

  // Find the header row within the first few rows (title/subtitle may sit above it).
  let headerRowIdx = -1;
  let headerIndices: (HeaderKey | undefined)[] = [];
  for (let r = 0; r < Math.min(rawRows.length, 8); r++) {
    const indices = rawRows[r].map((cell) => headerAliases.get(cell.toLowerCase()));
    if (indices.some((i) => i !== undefined)) {
      headerRowIdx = r;
      headerIndices = indices;
      break;
    }
  }
  const hasHeader = headerRowIdx >= 0;
  const body = hasHeader ? rawRows.slice(headerRowIdx + 1) : rawRows;

  for (const cells of body) {
    let itemCode: string | undefined;
    let description: string;
    let unit: string;
    let previous: number;
    let current: number;

    if (hasHeader) {
      const get = (key: HeaderKey): string | undefined => {
        const colIndex = headerIndices.indexOf(key);
        return colIndex >= 0 ? cells[colIndex] : undefined;
      };
      itemCode = get("itemCode") || undefined;
      description = get("description") ?? "";
      unit = get("unit") ?? "";
      previous = toFiniteNumber(get("previous"));
      current = toFiniteNumber(get("current"));
    } else {
      itemCode = cells[1] || undefined;
      description = cells[2] ?? "";
      unit = cells[3] ?? "";
      previous = toFiniteNumber(cells[4]);
      current = toFiniteNumber(cells[5]);
    }

    if (!description) continue;
    rows.push({
      itemCode,
      description,
      unit: unit || "م³",
      previous,
      current,
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
}export async function exportBoqToExcel(
  items: BoqExcelRow[],
  filename: string,
  headers: string[],
  sheetName = "مقايسة",
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Elwataniya ERP";
  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ rightToLeft: true }];

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

export interface ExtractListExcelRow {
  runningNumber?: number;
  label: string;
  date: string;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
}

/**
 * Export a list of contractor extracts as a real .xlsx workbook (RTL, styled).
 */
export async function exportExtractsListToExcel(
  rows: ExtractListExcelRow[],
  title: string,
  locale: "ar" | "en" = "ar",
): Promise<void> {
  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Elwataniya ERP";
  const sheet = workbook.addWorksheet(t("المستخلصات", "Extracts"));
  sheet.views = [{ rightToLeft: true }];

  const headers = [
    t("م", "#"),
    t("رقم المستخلص", "Running No"),
    t("البيان", "Label"),
    t("التاريخ", "Date"),
    t("الحالة", "Status"),
    t("قيمة الأعمال", "Work Value"),
    t("الاستقطاعات", "Deductions"),
    t("المستحق صرفة", "Net Payable"),
  ];
  sheet.columns = headers.map((h) => ({ header: h, width: 22 }));

  sheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F3864" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  rows.forEach((r, idx) => {
    const row = sheet.getRow(idx + 3);
    row.values = [
      idx + 1,
      r.runningNumber ?? "",
      r.label,
      r.date,
      t(r.status === "final" ? "معتمد" : "تحت الاعتماد", r.status === "final" ? "Approved" : "Pending"),
      r.totalWorkValue,
      r.totalDeductions,
      r.netPayable,
    ];
    [6, 7, 8].forEach((c) => {
      const cell = row.getCell(c);
      cell.numFmt = "#,##0.00";
      cell.alignment = { horizontal: "left" };
    });
    const net = row.getCell(8);
    net.font = { bold: true, color: { argb: "FF0A7A33" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExtractExcelItem {
  itemCode: string;
  description: string;
  unit: string;
  previous: number;
  current: number;
  total: number;
  executedQuantity: number;
  workValue: number;
}

export interface ExtractExcelPayload {
  title: string;
  subtitle: string;
  locale?: "ar" | "en";
  items: ExtractExcelItem[];
  otherAmountItems: { name: string; amount: number }[];
  deductions: { name: string; percentLabel: string; amount: number }[];
  totalWorkValue: number;
  otherAmounts: number;
  totalDeductions: number;
  netPayable: number;
}

const EXTRACT_HEADERS: Record<"ar" | "en", string[]> = {
  ar: ["م", "كود", "البيان", "الوحدة", "سابق", "حالي", "إجمالي", "منفذ", "القيمة"],
  en: ["#", "Code", "Description", "Unit", "Previous", "Current", "Total", "Executed", "Value"],
};

const MONEY_FMT = '#,##0.00';

/**
 * Export a contractor extract as a real .xlsx workbook (RTL, styled).
 */
export async function exportExtractToExcel(payload: ExtractExcelPayload): Promise<void> {
  const locale = payload.locale ?? "ar";
  const t = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Elwataniya ERP";
  const sheet = workbook.addWorksheet(t("مستخلص مقاول", "Contractor Extract"));
  sheet.views = [{ rightToLeft: true }];
  sheet.columns = EXTRACT_HEADERS[locale].map((h) => ({ header: h, width: h.length > 4 ? 22 : 14 }));

  let rowIndex = 1;

  const mergeTitle = (text: string) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, 9);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = { bold: true, size: 16 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    rowIndex += 1;
  };

  const mergeSubtitle = (text: string) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, 9);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = { size: 11, color: { argb: "FF555555" } };
    cell.alignment = { horizontal: "center" };
    rowIndex += 1;
  };

  const sectionHeader = (text: string) => {
    sheet.mergeCells(rowIndex, 1, rowIndex, 9);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = { bold: true, size: 13 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    cell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center" };
    rowIndex += 1;
  };

  const money = (value: number, style?: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> => ({
    numFmt: MONEY_FMT,
    alignment: { horizontal: "left" },
    ...style,
  });

  mergeTitle(payload.title);
  if (payload.subtitle) mergeSubtitle(payload.subtitle);

  rowIndex += 1;
  sectionHeader(t("بنود الأعمال", "Work Items"));
  const headerRow = sheet.getRow(rowIndex);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E2F3" },
  };
  rowIndex += 1;

  payload.items.forEach((item, idx) => {
    const r = sheet.getRow(rowIndex);
    const values: (string | number)[] = [
      idx + 1,
      item.itemCode,
      item.description,
      item.unit,
      item.previous,
      item.current,
      item.total,
      item.executedQuantity,
      item.workValue,
    ];
    values.forEach((v, c) => {
      const cell = r.getCell(c + 1);
      cell.value = v;
      if (c >= 4) cell.style = money(Number(v));
    });
    rowIndex += 1;
  });

  if (payload.otherAmountItems.length > 0) {
    rowIndex += 1;
    sectionHeader(t("أخرى (بنود إضافية)", "Other (additional items)"));
    const or = sheet.getRow(rowIndex);
    or.getCell(1).value = t("البيان", "Description");
    or.getCell(2).value = t("المبلغ", "Amount");
    or.font = { bold: true };
    rowIndex += 1;
    payload.otherAmountItems.forEach((i) => {
      const r = sheet.getRow(rowIndex);
      r.getCell(1).value = i.name;
      const c = r.getCell(2);
      c.value = i.amount;
      c.style = money(i.amount);
      rowIndex += 1;
    });
  }

  if (payload.deductions.length > 0) {
    rowIndex += 1;
    sectionHeader(t("الاستقطاعات", "Deductions"));
    const dr = sheet.getRow(rowIndex);
    dr.getCell(1).value = t("البيان", "Description");
    dr.getCell(2).value = t("النسبة %", "Percent %");
    dr.getCell(3).value = t("المبلغ", "Amount");
    dr.font = { bold: true };
    rowIndex += 1;
    payload.deductions.forEach((d) => {
      const r = sheet.getRow(rowIndex);
      r.getCell(1).value = d.name;
      r.getCell(2).value = d.percentLabel;
      const c = r.getCell(3);
      c.value = d.amount;
      c.style = money(d.amount);
      rowIndex += 1;
    });
  }

  rowIndex += 1;
  sectionHeader(t("ملخص المستخلص", "Extract Summary"));
  const summary: [string, number][] = [
    [t("قيمة الأعمال", "Work Value"), payload.totalWorkValue],
    ...(payload.otherAmounts > 0
      ? [[t("+ أخرى", "+ Other"), payload.otherAmounts] as [string, number]]
      : []),
    [t("إجمالي الاستقطاعات", "Total Deductions"), payload.totalDeductions],
    [t("المستحق صرفة", "Net Payable"), payload.netPayable],
  ];
  summary.forEach(([label, value]) => {
    const r = sheet.getRow(rowIndex);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    const c = r.getCell(2);
    c.value = value;
    c.style = money(value);
    if (label === t("المستحق صرفة", "Net Payable")) {
      r.getCell(1).font = { bold: true, color: { argb: "FF0A7A33" } };
      c.font = { bold: true, color: { argb: "FF0A7A33" } };
      r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF6EE" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF6EE" } };
    }
    rowIndex += 1;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.title}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
