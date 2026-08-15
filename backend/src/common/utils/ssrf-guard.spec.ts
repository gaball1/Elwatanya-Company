import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertSafeUrl, isUnsafeUrl } from './ssrf-guard.util';

describe('ssrf-guard', () => {
  it('rejects loopback and localhost targets', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/admin')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://localhost:3000')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://[::1]/')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects private and link-local networks', async () => {
    await expect(assertSafeUrl('http://10.0.0.5/secret')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://192.168.1.1/admin')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://172.16.0.1/x')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(assertSafeUrl('ftp://example.com/file')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('javascript:alert(1)')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes through non-fetched values', async () => {
    await expect(assertSafeUrl('')).resolves.toBe('');
    await expect(assertSafeUrl('/api/v1/files/public/123')).resolves.toBe('/api/v1/files/public/123');
    await expect(assertSafeUrl('data:image/png;base64,abc')).resolves.toBe('data:image/png;base64,abc');
  });

  it('sync guard flags private URLs', () => {
    expect(isUnsafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
    expect(isUnsafeUrl('http://localhost:3001/')).toBe(true);
    expect(isUnsafeUrl('http://10.1.1.1/')).toBe(true);
    expect(isUnsafeUrl('/api/v1/files/public/123')).toBe(false);
    expect(isUnsafeUrl('data:image/png;base64,abc')).toBe(false);
    expect(isUnsafeUrl('https://example.com/logo.png')).toBe(false);
  });
});
