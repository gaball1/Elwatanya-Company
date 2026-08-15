import { extname } from 'path';

const OCTET_STREAM = 'application/octet-stream';

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/**
 * Detects the real mime type of a binary buffer by inspecting its magic bytes.
 * Falls back to an extension-based lookup, then to the caller-provided type.
 * Generic `application/octet-stream` is only returned when nothing else matches.
 */
export function detectMimeType(buffer: Buffer, fallback: string = OCTET_STREAM, fileName?: string): string {
  const detected = sniffMimeType(buffer);
  if (detected && detected !== OCTET_STREAM) return detected;

  const ext = fileName ? extname(fileName).toLowerCase() : '';
  const byExt = ext ? EXT_TO_MIME[ext] : undefined;
  if (byExt) return byExt;

  if (fallback && fallback !== OCTET_STREAM) return fallback;
  return OCTET_STREAM;
}

function sniffMimeType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 8) return null;

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';

  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'image/bmp';

  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer.length >= 12) {
      const tag = buffer.toString('latin1', 8, 12);
      if (tag === 'WEBP') return 'image/webp';
      if (tag === 'WAVE') return 'audio/wav';
    }
    return 'application/octet-stream';
  }

  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';

  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const name = buffer.toString('latin1', 0, 60);
    if (name.includes('[Content_Types].xml')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/zip';
  }

  if (buffer[0] === 0x3c) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).toLowerCase();
    if (head.includes('<svg')) return 'image/svg+xml';
  }

  return null;
}
