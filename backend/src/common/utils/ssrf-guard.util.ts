import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const IPV4_PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/;
const IPV6_PRIVATE = /^(::1$|::|fe8|fe9|fea|feb|fc|fd|2001:db8:)/i;

// Reserved/internal hostname suffixes that never resolve to a public endpoint.
// Checked synchronously so guards work without a DNS round-trip.
const INTERNAL_HOSTNAME_RE =
  /(^|\.)localhost$|(^|\.)internal$|(^|\.)local$|(^|\.)lan$|(^|\.)home$|(^|\.)corp$|^metadata\.google\.internal$/i;

/** True when the given address/hostname targets an internal/private endpoint. */
export function isPrivateAddress(address: string): boolean {
  if (!address) return false;
  const host = address.toLowerCase();
  if (host === 'localhost') return true;
  if (INTERNAL_HOSTNAME_RE.test(host)) return true;
  const bare = host.replace(/^\[(.*)\]$/, '$1'); // strip IPv6 brackets
  if (isIP(bare) === 4) return IPV4_PRIVATE.test(bare);
  if (isIP(bare) === 6) return IPV6_PRIVATE.test(bare);
  // Hostname: DNS resolution is performed by isHostnamePrivate().
  return false;
}

/** True when the hostname itself (or any resolved address) is private/internal. */
export function isHostnamePrivate(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  if (isPrivateAddress(host)) return Promise.resolve(true);
  return lookup(host)
    .then(({ address }) => isPrivateAddress(address))
    .catch(() => true);
}

/**
 * Guards server-side fetches (e.g. headless PDF rendering) against SSRF.
 * Only public http/https URLs are allowed; loopback, private, link-local,
 * metadata and unknown-host targets are rejected. Relative paths and
 * data:image URIs are not fetched over the network and pass through.
 */
export async function assertSafeUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return rawUrl;

  // Relative API paths and inline data URIs are never fetched via network.
  if (/^data:image\//.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) return rawUrl;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(`URL protocol not allowed: ${parsed.protocol}`);
  }

  if (isPrivateAddress(parsed.hostname)) {
    throw new BadRequestException('Fetching private/internal addresses is not allowed');
  }

  if (await isHostnamePrivate(parsed.hostname)) {
    throw new BadRequestException('Fetching private/internal addresses is not allowed');
  }

  return rawUrl;
}

/** Non-blocking guard for synchronous call sites: rejects clearly-private URLs. */
export function isUnsafeUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (/^data:image\//.test(rawUrl)) return false;
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    return isPrivateAddress(parsed.hostname);
  } catch {
    return true;
  }
}
