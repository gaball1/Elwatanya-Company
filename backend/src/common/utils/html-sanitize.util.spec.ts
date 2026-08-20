import { describe, it, expect } from 'vitest';
import { sanitizeHtmlFragment, sanitizeCss } from './html-sanitize.util';

describe('html-sanitize', () => {
  it('removes script blocks entirely (including content)', () => {
    const out = sanitizeHtmlFragment('<p>hello</p><script>fetch("http://169.254.169.254/")</script><p>end</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('fetch');
    expect(out).toContain('<p>hello</p>');
    expect(out).toContain('<p>end</p>');
  });

  it('removes iframe/object/embed/svg/form elements entirely', () => {
    const out = sanitizeHtmlFragment(
      '<iframe src="http://evil.com"></iframe><object data="x"></object><svg><script/></svg><form action="http://evil.com"><input name=x></form><p>ok</p>',
    );
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('object');
    expect(out).not.toContain('svg');
    expect(out).not.toContain('form');
    expect(out).not.toContain('input');
    expect(out).toContain('<p>ok</p>');
  });

  it('strips event-handler attributes', () => {
    const out = sanitizeHtmlFragment(
      '<div onclick="alert(1)" onmouseover="steal()" class="box">safe</div>',
    );
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onmouseover');
    expect(out).toContain('class="box"');
    expect(out).toContain('safe');
  });

  it('strips javascript: and unsafe protocol URLs', () => {
    const out = sanitizeHtmlFragment(
      '<a href="javascript:alert(1)">x</a><a href="vbscript:x">y</a><a href="https://example.com">ok</a>',
    );
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('vbscript:');
    expect(out).toContain('href="https://example.com"');
  });

  it('keeps safe img URLs and drops private/internal ones', () => {
    const out = sanitizeHtmlFragment(
      '<img src="data:image/png;base64,AAA"><img src="/api/v1/files/public/1"><img src="http://169.254.169.254/meta">',
    );
    expect(out).toContain('data:image/png;base64,AAA');
    expect(out).toContain('/api/v1/files/public/1');
    expect(out).not.toContain('169.254.169.254');
  });

  it('drops the src attribute for private hostnames', () => {
    const out = sanitizeHtmlFragment('<img src="http://metadata.google.internal/x">');
    expect(out).not.toContain('http://metadata.google.internal');
  });

  it('keeps print layout tables with colspan/rowspan and inline styles', () => {
    const out = sanitizeHtmlFragment(
      '<table><tr><td colspan="2" rowspan="3" style="background:#fff;font-weight:700;border:1px solid #ccc">أ</td><td style="color:#1e40af">ب</td></tr></table>',
    );
    expect(out).toContain('<table>');
    expect(out).toContain('colspan="2"');
    expect(out).toContain('rowspan="3"');
    expect(out).toContain('background:#fff');
    expect(out).toContain('أ');
  });

  it('keeps a <style> block but sanitizes its CSS', () => {
    const out = sanitizeHtmlFragment(
      '<style>.foo { color: red; background: url(http://169.254.169.254/meta); }</style><p>hi</p>',
    );
    expect(out).toContain('<style>');
    expect(out).toContain('.foo');
    expect(out).not.toContain('url(');
    expect(out).not.toContain('169.254.169.254');
    expect(out).toContain('<p>hi</p>');
  });

  it('removes @import and expression() from style attributes', () => {
    const out = sanitizeHtmlFragment(
      '<div style="@import url(http://evil.com/x);background:expression(alert(1));color:red;">x</div>',
    );
    expect(out).not.toContain('@import');
    expect(out).not.toContain('expression');
    expect(out).not.toContain('url(');
    expect(out).toContain('color:red');
  });

  it('strips comments and doctype wrappers but keeps content', () => {
    const out = sanitizeHtmlFragment('<!-- hidden --><!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>text</p></body></html>');
    expect(out).not.toContain('hidden');
    expect(out).not.toContain('<!DOCTYPE');
    expect(out).not.toContain('<meta');
    expect(out).not.toContain('<html');
    expect(out).not.toContain('<body');
    expect(out).toContain('<p>text</p>');
  });

  it('escapes stray ampersands and passes safe entities through', () => {
    expect(sanitizeHtmlFragment('a & b')).toBe('a &amp; b');
    expect(sanitizeHtmlFragment('&nbsp; &amp; &#x200F;')).toBe('&nbsp; &amp; &#x200F;');
  });

  it('drops unknown tags but keeps their text', () => {
    const out = sanitizeHtmlFragment('<foo bar="x">hello</foo>');
    expect(out).not.toContain('<foo');
    expect(out).toContain('hello');
  });

  it('handles empty and non-string input', () => {
    expect(sanitizeHtmlFragment('')).toBe('');
    expect(sanitizeHtmlFragment(null as unknown as string)).toBe('');
    expect(sanitizeHtmlFragment(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeCss', () => {
  it('strips url(), @import, expression and javascript references', () => {
    const css =
      '@import url("http://evil.com/a.css");.a{background:url(https://example.com/i.png)}.b{width:expression(alert(1))}.c{color:red}';
    const out = sanitizeCss(css);
    expect(out).not.toContain('url(');
    expect(out).not.toContain('@import');
    expect(out).not.toContain('expression');
    expect(out).not.toContain('javascript');
    expect(out).toContain('color:red');
  });

  it('strips CSS comments', () => {
    expect(sanitizeCss('.a{color:red}/* nope */')).not.toContain('nope');
  });
});
