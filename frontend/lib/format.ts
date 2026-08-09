/* eslint-disable */

export type NumberUnit = "currency" | "percent" | "ratio" | "count" | "days" | "score" | "none";

interface FormatOptions {
  locale?: string;
  currency?: string;
  currencySymbol?: string;
}

function cleanNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

function decimalsFor(unit: NumberUnit): number {
  switch (unit) {
    case "currency":
      return 0;
    case "percent":
      return 1;
    case "ratio":
      return 2;
    case "days":
      return 0;
    case "count":
    case "score":
    default:
      return 0;
  }
}

export function formatNumber(
  value: number,
  unit: NumberUnit = "none",
  opts: FormatOptions = {}
): string {
  const locale = opts.locale || "en-US";
  const v = cleanNumber(value);
  const decimals = decimalsFor(unit);

  let formatted: string;
  if (unit === "percent") {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  } else {
    formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
    }).format(v);
  }

  return formatted;
}

export function formatCurrency(
  value: number,
  opts: FormatOptions = {}
): string {
  const locale = opts.locale || "en-US";
  const symbol = opts.currencySymbol ?? (locale === "ar" ? "ج.م" : "EGP");
  const v = cleanNumber(value);
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(v);
  return `${formatted} ${symbol}`;
}

export function formatPercent(value: number, opts: FormatOptions = {}): string {
  const locale = opts.locale || "en-US";
  const v = cleanNumber(value);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);
  return `${formatted}%`;
}

export function formatRatio(value: number, opts: FormatOptions = {}): string {
  const locale = opts.locale || "en-US";
  const v = cleanNumber(value);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  return formatted;
}

export function formatCount(value: number, opts: FormatOptions = {}): string {
  const locale = opts.locale || "en-US";
  const v = cleanNumber(value);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);
}

export function unitSymbol(unit: NumberUnit, locale: string = "en-US"): string {
  switch (unit) {
    case "currency":
      return locale === "ar" ? "ج.م" : "EGP";
    case "percent":
      return "%";
    case "ratio":
      return "";
    case "days":
      return locale === "ar" ? "يوم" : "days";
    case "count":
      return "";
    case "score":
      return "";
    default:
      return "";
  }
}

export function formatUnitValue(
  value: number,
  unit: string,
  locale: string = "en-US"
): { text: string; unit: string } {
  switch (unit) {
    case "currency":
      return { text: formatNumber(value, "currency", { locale }), unit: unitSymbol("currency", locale) };
    case "percent":
      return { text: formatPercent(value, { locale }), unit: "%" };
    case "ratio":
      return { text: formatRatio(value, { locale }), unit: "" };
    case "days":
      return { text: formatCount(value, { locale }), unit: unitSymbol("days", locale) };
    case "count":
      return { text: formatCount(value, { locale }), unit: "" };
    case "score":
      return { text: formatCount(value, { locale }), unit: "" };
    default:
      return { text: formatNumber(value, "none", { locale }), unit: unit || "" };
  }
}
