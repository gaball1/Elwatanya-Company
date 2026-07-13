// lib/security.ts

/**
 * تنظيف المدخلات النصية لمنع XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * التحقق من صحة رقمي (لمنع حقن SQL)
 * @param value - القيمة المدخلة (يمكن أن تكون string أو number)
 * @returns رقم صحيح أو 0 إذا كانت القيمة غير صالحة
 */
export function sanitizeNumber(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

/**
 * التحقق من صحة التاريخ
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * توليد Token عشوائي للـ Forms
 */
export function generateCSRFToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * التحقق من أن المبلغ موجب
 * @param amount - المبلغ المدخل
 * @returns true إذا كان المبلغ رقم موجب وصحيح
 */
export function isValidAmount(amount: unknown): boolean {
  if (typeof amount !== "number") return false;
  return amount > 0 && isFinite(amount);
}

/**
 * تشفير بسيط للبيانات (للـ localStorage)
 * @param data - البيانات النصية للتشفير
 * @returns البيانات المشفرة
 */
export function encryptData(data: string): string {
  if (typeof window === "undefined") return data;
  return btoa(encodeURIComponent(data));
}

/**
 * فك تشفير البيانات
 * @param encrypted - البيانات المشفرة
 * @returns البيانات الأصلية بعد فك التشفير
 */
export function decryptData(encrypted: string): string {
  if (typeof window === "undefined") return encrypted;
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return encrypted;
  }
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * التحقق من صحة رقم الهاتف المصري
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const phoneRegex = /^01[0125][0-9]{8}$/;
  return phoneRegex.test(phone);
}

/**
 * تنظيف كائن من البيانات الخطرة
 * @param obj - الكائن المراد تنظيفه
 * @returns كائن جديد بكل القيم المنظفة
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "string") {
        result[key] = sanitizeInput(value) as T[Extract<keyof T, string>];
      } else if (typeof value === "number") {
        result[key] = sanitizeNumber(value) as T[Extract<keyof T, string>];
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * ✅ التحقق من عدم تكرار الاسم في المخازن
 * @param items - قائمة الأصناف
 * @param name - الاسم المراد التحقق منه
 * @param excludeId - ID المستثنى (في حالة التعديل)
 */
// lib/security.ts

/**
 * ✅ التحقق من عدم تكرار الاسم في المخازن
 */
export function isDuplicateName(
  items: { id: string; name: string; code: string }[],
  name: string,
  excludeId?: string
): boolean {
  return items.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId
  );
}

/**
 * ✅ التحقق من عدم تكرار الكود في المخازن
 */
export function isDuplicateCode(
  items: { id: string; code: string; name: string }[],
  code: string,
  excludeId?: string
): boolean {
  return items.some(
    (item) =>
      item.code.toLowerCase() === code.toLowerCase() && item.id !== excludeId
  );
}
