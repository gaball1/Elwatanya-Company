import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const IPV4_PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/;
const IPV6_PRIVATE = /^(::1$|::|fe8|fe9|fea|feb|fc|fd|2001:db8:)/i;

/** True when the given host is an internal/private address that must never be fetched. */
export function isPrivateAddress(address: string): boolean {
  if (!address) return false;
  if (address.toLowerCase() === 'localhost') return true;
  if (isIP(address) === 4) return IPV4_PRIVATE.test(address);
  if (isIP(address) === 6) return IPV6_PRIVATE.test(address);
  // Hostname: resolve once and inspect the resulting address.
  return false;
}

async function isPrivateHostname(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') return true;
  return lookup(host)
    .then(({ address }) => {
      if (isIP(address) === 4 && IPV4_PRIVATE.test(address)) return true;
      if (isIP(address) === 6 && IPV6_PRIVATE.test(address)) return true;
      // Also flag link-local/metadata ranges by resolved address string.
      return /^169\.254\.|^fe8|^fe9|^fea|^feb/.test(address);
    })
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

  if (await isPrivateHostname(parsed.hostname)) {
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
