import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ALLOWED_FILE_CATEGORIES,
  isAllowedCategory,
  isAllowedMimeType,
  isAllowedCompanyMimeType,
  MAX_FILE_SIZE_BYTES,
} from './file-security.constants';
import { LocalFileStorageProvider } from '../infrastructure/storage/local-file-storage.provider';

describe('file-security constants', () => {
  it('allows only whitelisted categories', () => {
    expect(ALLOWED_FILE_CATEGORIES).toContain('company');
    expect(ALLOWED_FILE_CATEGORIES).toContain('drawing');
    expect(isAllowedCategory('company')).toBe(true);
    expect(isAllowedCategory('../company')).toBe(false);
    expect(isAllowedCategory('../../etc')).toBe(false);
    expect(isAllowedCategory('unknown-category')).toBe(false);
    expect(isAllowedCategory('')).toBe(false);
    expect(isAllowedCategory('company%2f..%2f')).toBe(false);
  });

  it('allows safe raster images and documents but never SVG/HTML', () => {
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedMimeType('text/html')).toBe(false);
    expect(isAllowedMimeType('application/xhtml+xml')).toBe(false);
    expect(isAllowedMimeType('application/javascript')).toBe(false);
    expect(isAllowedMimeType('application/x-msdownload')).toBe(false);
    expect(isAllowedMimeType('application/octet-stream')).toBe(false);
  });

  it('restricts company assets to safe raster images only', () => {
    expect(isAllowedCompanyMimeType('image/png')).toBe(true);
    expect(isAllowedCompanyMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedCompanyMimeType('application/pdf')).toBe(false);
  });

  it('caps the upload size', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('LocalFileStorageProvider path containment', () => {
  it('rejects paths that escape the uploads directory', async () => {
    const provider = new LocalFileStorageProvider();
    await expect(provider.save(Buffer.from('x'), '../evil.txt', 'text/plain')).rejects.toThrow(
      'escapes the uploads directory',
    );
    await expect(provider.read('../evil.txt')).rejects.toThrow('escapes the uploads directory');
    await expect(provider.delete('../evil.txt')).rejects.toThrow('escapes the uploads directory');
  });

  it('rejects absolute paths', async () => {
    const provider = new LocalFileStorageProvider();
    const absolute = join(tmpdir(), 'evil.txt');
    await expect(provider.save(Buffer.from('x'), absolute, 'text/plain')).rejects.toThrow(
      'escapes the uploads directory',
    );
  });

  it('accepts paths inside the uploads directory', async () => {
    const provider = new LocalFileStorageProvider();
    await expect(provider.save(Buffer.from('x'), 'company/logo.png', 'image/png')).resolves.toBe(
      'company/logo.png',
    );
  });
});
