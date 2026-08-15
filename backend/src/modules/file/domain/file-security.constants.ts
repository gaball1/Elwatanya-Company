/**
 * Security policy for file uploads.
 * Categories are validated against this allowlist; MIME types are validated
 * against per-category magic-byte allowlists. SVG and HTML are rejected
 * because they are executable in the browser origin.
 */

export const ALLOWED_FILE_CATEGORIES = [
  'branding',
  'attachment',
  'contract',
  'drawing',
  'boq',
  'invoice',
  'extract-pdf',
  'image',
  'knowledge',
  'signature',
  'company',
  'building-document',
] as const;

export type FileCategory = (typeof ALLOWED_FILE_CATEGORIES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME types considered safe to serve inline in the browser origin. */
export const SAFE_INLINE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

/** MIME types allowed for storage (all categories). SVG/HTML excluded on purpose. */
export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'video/mp4',
  'video/webm',
]);

/** Only images are allowed for the publicly served company category. */
export const COMPANY_CATEGORY_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

export function isAllowedCategory(category: string): boolean {
  return (ALLOWED_FILE_CATEGORIES as readonly string[]).includes(category);
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function isAllowedCompanyMimeType(mimeType: string): boolean {
  return COMPANY_CATEGORY_MIME_TYPES.has(mimeType);
}

export function isSafeInlineMimeType(mimeType: string): boolean {
  return SAFE_INLINE_MIME_TYPES.has(mimeType);
}
