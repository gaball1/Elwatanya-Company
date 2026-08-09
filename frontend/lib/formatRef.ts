/**
 * Human-readable identifiers for the UI.
 *
 * Raw UUIDs are never shown to end users. Anywhere an entity id must be
 * displayed (references, cards, tables, headers) we render a stable short
 * reference derived from the id (e.g. `#A1B2C3`) instead.
 */
export function shortRef(id?: string | null): string {
  if (!id) return "—";
  const clean = id.replace(/-/g, "");
  return `#${clean.slice(-6).toUpperCase()}`;
}

export function entityLabel(type: string, isArabic: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    project: { ar: "مشروع", en: "Project" },
    building: { ar: "مبنى", en: "Building" },
    purchase_order: { ar: "أمر شراء", en: "Purchase Order" },
    purchase: { ar: "مشتريات", en: "Purchase" },
    extract: { ar: "خلاصة", en: "Extract" },
    payment: { ar: "دفعة", en: "Payment" },
    invoice: { ar: "فاتورة", en: "Invoice" },
    statement: { ar: "بيان", en: "Statement" },
    fund: { ar: "عهدة", en: "Fund" },
    inventory_item: { ar: "صنف مخزني", en: "Inventory Item" },
    employee: { ar: "موظف", en: "Employee" },
    attendance: { ar: "حضور", en: "Attendance" },
  };
  const map = labels[type];
  if (map) return isArabic ? map.ar : map.en;
  return type;
}
