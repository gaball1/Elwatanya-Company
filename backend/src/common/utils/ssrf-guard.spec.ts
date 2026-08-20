import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

vi.mock('dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'dns/promises';
import { assertSafeUrl, isUnsafeUrl, isPrivateAddress, isHostnamePrivate } from './ssrf-guard.util';

const mockedLookup = vi.mocked(lookup);

beforeEach(() => {
  mockedLookup.mockReset();
});

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

  it('rejects internal/reserved hostnames synchronously', async () => {
    await expect(assertSafeUrl('http://metadata.google.internal/latest/meta-data/')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(assertSafeUrl('http://router.local/admin')).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeUrl('http://db.internal:5432/')).rejects.toBeInstanceOf(BadRequestException);
    expect(isPrivateAddress('metadata.google.internal')).toBe(true);
    expect(isPrivateAddress('foo.internal')).toBe(true);
    expect(isPrivateAddress('foo.local')).toBe(true);
    expect(isPrivateAddress('myhost.lan')).toBe(true);
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
    expect(isUnsafeUrl('http://intranet.internal/')).toBe(true);
    expect(isUnsafeUrl('/api/v1/files/public/123')).toBe(false);
    expect(isUnsafeUrl('data:image/png;base64,abc')).toBe(false);
    expect(isUnsafeUrl('https://example.com/logo.png')).toBe(false);
  });

  it('rejects a hostname that resolves to a private address', async () => {
    mockedLookup.mockResolvedValueOnce({ address: '10.0.0.7', family: 4 });
    await expect(isHostnamePrivate('evil-internal.example.com')).resolves.toBe(true);
  });

  it('allows a hostname that resolves to a public address', async () => {
    mockedLookup.mockResolvedValueOnce({ address: '93.184.216.34', family: 4 });
    await expect(isHostnamePrivate('example.com')).resolves.toBe(false);
  });

  it('treats unresolvable hostnames as private (fail-closed)', async () => {
    mockedLookup.mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(isHostnamePrivate('no-such-host.invalid')).resolves.toBe(true);
  });

  it('flags internal hostnames synchronously without DNS', async () => {
    await expect(isHostnamePrivate('metadata.google.internal')).resolves.toBe(true);
    await expect(isHostnamePrivate('localhost')).resolves.toBe(true);
    expect(mockedLookup).not.toHaveBeenCalled();
  });
});
