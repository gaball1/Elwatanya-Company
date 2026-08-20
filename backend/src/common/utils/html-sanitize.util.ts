import { isPrivateAddress } from './ssrf-guard.util';

// ---------------------------------------------------------------------------
// HTML sanitizer for untrusted document content rendered by the headless PDF
// browser. This is an allowlist: only known-safe tags/attributes survive.
//
// The frontend ships full printable documents (tables, inline styles, <style>
// blocks, data:image logos) inside PDF sections, so the allowlist is generous
// for print layout but strips every execution/SSRF vector:
//   - <script>, <iframe>, <object>, <embed>, SVG/MathML, forms, media ...
//   - on* event handler attributes
//   - javascript:/vbscript:/data:(non-image) URLs
//   - private/internal URL targets (SSRF) in src/href
//   - CSS url(), @import, expression(), behavior, -moz-binding
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'address', 'b', 'big', 'blockquote', 'br', 'caption', 'center',
  'cite', 'code', 'dd', 'del', 'dfn', 'div', 'dl', 'dt', 'em', 'font', 'h1',
  'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark',
  'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strike', 'strong', 'sub',
  'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'tt',
  'u', 'ul', 'var',
]);

// Structural tags: keep inner content, drop only the wrapper.
const STRUCTURAL_TAGS = new Set(['html', 'head', 'body']);

// Tags removed entirely, including their inner content.
const DROP_CONTENT_TAGS = new Set([
  'applet', 'audio', 'canvas', 'datalist', 'details', 'dialog', 'embed',
  'form', 'frame', 'frameset', 'iframe', 'label', 'marquee',
  'math', 'menu', 'noscript', 'noframes', 'object', 'optgroup',
  'option', 'script', 'select', 'style', 'summary', 'svg', 'template', 'textarea',
  'title', 'video',
]);

// Void elements carry no inner content; only the opening tag is dropped.
const VOID_TAGS = new Set([
  'area', 'base', 'col', 'embed', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Attributes always permitted (independent of tag).
const GLOBAL_ATTRS = new Set([
  'class', 'id', 'title', 'dir', 'lang', 'align', 'valign', 'width', 'height',
  'cellpadding', 'cellspacing', 'border', 'bgcolor', 'color', 'colspan',
  'rowspan', 'scope', 'abbr', 'headers', 'nowrap', 'style',
]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'name', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'title']),
  table: new Set(['summary']),
};

const CSS_STRIP =
  /@import[^;]*;?|url\(\s*(['"]?)[^)'"]*\1\s*\)|image-set\([\s\S]*?\)|expression\(\s*[\s\S]*?\s*\)|behavior\s*:\s*[^;]+;?|-moz-binding\s*:\s*[^;]+;?|src\s*:\s*[^;]+;?|javascript\s*:/gi;

const TAG_RE = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/;
const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9:_.-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g;

/** Strips dangerous directives from CSS while preserving layout rules. */
export function sanitizeCss(css: string): string {
  return css.replace(CSS_STRIP, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function isValidUrlValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^#/.test(trimmed)) return true; // in-document anchors
  if (/^data:image\//i.test(trimmed)) return true;
  // Relative paths (single leading slash, or ./ ../) resolve against the
  // renderer base URL and never leave the application origin.
  if (/^\/[^/]/.test(trimmed)) return true;
  if (/^\.{1,2}\//.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return !isPrivateAddress(parsed.hostname);
  } catch {
    return false;
  }
}

function sanitizeAttrs(name: string, attrBlock: string): string {
  const out: string[] = [];
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrBlock)) !== null) {
    const attrName = m[1].toLowerCase();
    const attrValue = m[2];

    if (attrName.startsWith('on')) continue; // event handlers
    if (attrName === 'style') {
      const clean = sanitizeCss(attrValue.replace(/^["']|["']$/g, '')).trim();
      if (clean) out.push(`style="${clean.replace(/"/g, '&quot;')}"`);
      continue;
    }

    const allowed =
      GLOBAL_ATTRS.has(attrName) || (TAG_ATTRS[name]?.has(attrName) ?? false);
    if (!allowed) continue;

    const unquoted = attrValue.replace(/^["']|["']$/g, '');
    if ((attrName === 'src' || attrName === 'href' || attrName === 'action') && !isValidUrlValue(unquoted)) {
      continue;
    }
    if (attrName === 'target') {
      const t = unquoted.toLowerCase();
      if (t !== '_blank' && t !== '_self' && t !== '_top') continue;
    }

    out.push(`${attrName}="${unquoted.replace(/["<>`]/g, '')}"`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

/** Skips past an entire element (including nested same-name tags) starting at `start`. */
function skipElement(html: string, start: number, tagName: string): number {
  let depth = 1;
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  // Skip the opening tag itself so only nested tags are counted.
  const firstGt = html.indexOf('>', start);
  re.lastIndex = firstGt === -1 ? html.length : firstGt + 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = m[1].toLowerCase();
    const isClose = m[0][1] === '/';
    if (n === tagName) {
      if (isClose) {
        depth -= 1;
        if (depth === 0) return re.lastIndex;
      } else {
        depth += 1;
      }
    }
  }
  return html.length;
}

/** Sanitizes an untrusted HTML fragment, keeping safe print layout markup. */
export function sanitizeHtmlFragment(html: string): string {
  if (!html) return '';
  const source = String(html);
  let out = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (ch === '<') {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4);
        i = end === -1 ? len : end + 3;
        continue;
      }
      if (/^<!\s*[a-zA-Z]/.test(source.slice(i, i + 8))) {
        // Doctype and similar declarations: skip the tag, keep following text.
        const gt = source.indexOf('>', i);
        i = gt === -1 ? len : gt + 1;
        continue;
      }

      const gt = source.indexOf('>', i);
      if (gt === -1) {
        out += source.slice(i);
        break;
      }
      const raw = source.slice(i, gt + 1);
      const tagMatch = TAG_RE.exec(raw);
      if (!tagMatch) {
        out += '&lt;';
        i += 1;
        continue;
      }

      const isClosing = tagMatch[1] === '/';
      const name = tagMatch[2].toLowerCase();

      if (isClosing) {
        if (ALLOWED_TAGS.has(name)) out += `</${name}>`;
        i = gt + 1;
        continue;
      }

      if (name === 'style') {
        // Keep <style> but sanitize its CSS (strip url()/@import/expression).
        const end = skipElement(source, i, 'style');
        const innerStart = gt + 1;
        const innerEnd = Math.max(innerStart, end - '</style>'.length);
        const inner = source.slice(innerStart, innerEnd);
        out += `<style>${sanitizeCss(inner)}</style>`;
        i = end;
        continue;
      }

      if (DROP_CONTENT_TAGS.has(name)) {
        i = VOID_TAGS.has(name) ? gt + 1 : skipElement(source, i, name);
        continue;
      }

      if (STRUCTURAL_TAGS.has(name)) {
        // Drop the wrapper tag, keep inner content.
        i = gt + 1;
        continue;
      }

      if (ALLOWED_TAGS.has(name)) {
        const attrBlock = raw.slice(tagMatch[0].length, -1);
        out += `<${name}${sanitizeAttrs(name, attrBlock)}>`;
        i = gt + 1;
        continue;
      }

      // Unknown tag: drop the tag itself, keep following content as text.
      i = gt + 1;
      continue;
    }

    if (ch === '&') {
      // Pass entities through verbatim; they decode to plain text only.
      const semi = source.indexOf(';', i);
      if (semi !== -1 && semi - i <= 10) {
        out += source.slice(i, semi + 1);
        i = semi + 1;
      } else {
        out += '&amp;';
        i += 1;
      }
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}
