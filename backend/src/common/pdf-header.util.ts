import { Response } from 'express';

export const PDF_MIME = 'application/pdf';

/**
 * Builds an RFC 5987 / RFC 6266-compliant Content-Disposition value.
 *
 * Non-ASCII (Arabic etc.) filenames MUST NOT be sent in a plain
 * `filename="…"` parameter because Node's header value validation only
 * accepts Latin-1 and throws `ERR_INVALID_CHAR`. The Unicode name is
 * carried with the `filename*=UTF-8''…` extension; an ASCII sanitized
 * `filename="…"` is provided as a graceful fallback.
 */
export function buildContentDisposition(
  filename: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): string {
  const ascii = toAsciiFallback(filename);
  const utf8Value = encodeRFC5987(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${utf8Value}`;
}

/** Header-safe ASCII name for legacy clients (strips all non-ASCII + hostiles). */
function toAsciiFallback(filename: string): string {
  const cleaned = filename
    .replace(/["\\\r\n\t]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[/]/g, '-')
    .trim();
  return cleaned || 'document.pdf';
}

/** RFC 5987 value (attrib-char | "%" HEXDIG HEXDIG | "'" …). */
function encodeRFC5987(filename: string): string {
  const safe = filename
    .replace(/["\\\r\n\t]/g, '')
    .replace(/[^\x20-\x7E]/g, (ch) => {
      const cp = Array.from(ch)[0].codePointAt(0);
      // encodeURIComponent handles everything; we just re-join below
      return ch;
    })
    .trim();
  return encodeURIComponent(safe || 'document.pdf').replace(/'/g, '%27');
}

/** Stream a binary payload with correct headers. */
export function sendFileResponse(
  res: Response,
  buffer: Buffer,
  filename: string,
  mimeType = PDF_MIME,
  disposition: 'attachment' | 'inline' = 'attachment',
): void {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(filename, disposition));
  res.setHeader('Content-Length', String(buffer.length));
  res.end(buffer);
}