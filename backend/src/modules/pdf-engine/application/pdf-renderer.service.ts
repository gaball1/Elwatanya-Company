import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Route } from 'playwright';
import { isHostnamePrivate } from '@/common/utils/ssrf-guard.util';

export const RENDER_TIMEOUT_MS = 30_000;

export interface PdfHeaderFooterOptions {
  /** HTML fragment for the header shown on every page. */
  headerTemplate?: string;
  /** HTML fragment for the footer shown on every page. */
  footerTemplate?: string;
  /** Extra top margin in mm to make room for the header. */
  headerHeight?: string;
  /** Extra bottom margin in mm to make room for the footer. */
  footerHeight?: string;
}

@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  async renderToPdf(
    html: string,
    options: {
      format?: 'A4' | 'A3' | 'Letter';
      orientation?: 'portrait' | 'landscape';
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
      printBackground?: boolean;
      baseUrl?: string;
      header?: PdfHeaderFooterOptions;
      timeoutMs?: number;
    } = {},
  ): Promise<Buffer> {
    const browser = await this.getBrowser();

    const timeout = options.timeoutMs ?? RENDER_TIMEOUT_MS;
    const result = await Promise.race([
      this.renderInContext(browser, html, options),
      new Promise<Buffer>((_, reject) =>
        setTimeout(() => reject(new Error(`PDF rendering timed out after ${timeout}ms`)), timeout),
      ),
    ]);
    return result;
  }

  private async renderInContext(
    browser: Browser,
    html: string,
    options: {
      format?: 'A4' | 'A3' | 'Letter';
      orientation?: 'portrait' | 'landscape';
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
      printBackground?: boolean;
      baseUrl?: string;
      header?: PdfHeaderFooterOptions;
      timeoutMs?: number;
    },
  ): Promise<Buffer> {
    const context: BrowserContext = await browser.newContext({
      locale: 'ar-EG',
      deviceScaleFactor: 2,
    });

    try {
      const page = await context.newPage();

      const baseUrl = options.baseUrl || 'http://localhost:3001';
      const normalizedHtml = this.resolveRelativeUrls(html, baseUrl);

      // Defense-in-depth against SSRF: only the application origin, inline
      // data/blob resources, and public http(s) targets may be fetched while
      // rendering. Private/internal hosts are aborted (fail-closed).
      await page.route('**/*', async (route: Route) => {
        await this.handleRoute(route, baseUrl);
      });

      await page.setContent(normalizedHtml, {
        waitUntil: 'networkidle',
        timeout: RENDER_TIMEOUT_MS,
      });

      // Give images a chance to finish decoding before snapshotting.
      await page.waitForTimeout(600);
      await page.evaluate(() => Promise.all(
        Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => new Promise<void>((resolve) => {
            const originalSrc = img.src;
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = originalSrc;
          })),
      ));
      await page.waitForTimeout(200);

      const headerHeight = options.header?.headerHeight || '24mm';
      const footerHeight = options.header?.footerHeight || '16mm';

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: {
          top: options.margin?.top || '28mm',
          right: options.margin?.right || '18mm',
          bottom: options.margin?.bottom || '22mm',
          left: options.margin?.left || '18mm',
        },
        printBackground: options.printBackground ?? true,
        displayHeaderFooter: true,
        headerTemplate: options.header?.headerTemplate || '<span></span>',
        footerTemplate: options.header?.footerTemplate || '<span></span>',
        // Nested full-HTML documents from the frontend ship their own @page
        // rules; ignore them so page size and header/footer margins stay
        // consistent and nothing is clipped at page boundaries.
        preferCSSPageSize: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await context.close();
    }
  }

  /**
   * SSRF filter for every request the headless browser makes while rendering.
   * Allows: application origin (baseUrl), data:/blob:/about: inline resources,
   * and public http(s) hosts. Anything else — including internal hostnames,
   * private networks and unresolvable hosts — is aborted.
   */
  private async handleRoute(route: Route, baseUrl: string): Promise<void> {
    try {
      const url = new URL(route.request().url());

      if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') {
        await route.continue();
        return;
      }

      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const allowedOrigin = new URL(baseUrl).origin;
        if (url.origin === allowedOrigin) {
          await route.continue();
          return;
        }
        if (await isHostnamePrivate(url.hostname)) {
          await route.abort('blockedbyclient');
          return;
        }
        await route.continue();
        return;
      }

      await route.abort('blockedbyclient');
    } catch {
      await route.abort('blockedbyclient');
    }
  }

  /**
   * Rewrites relative URLs so Playwright can fetch them while rendering.
   * Also maps legacy JWT-protected download URLs to the public asset route,
   * because the headless browser sends no Authorization header.
   */
  private resolveRelativeUrls(html: string, baseUrl: string): string {
    // /api/v1/files/download/:id requires auth; the headless browser sends no
    // Authorization header, so rewrite to the public company-asset route first.
    let resolved = html.replace(
      /(\/api\/v1\/files\/download\/)/g,
      '/api/v1/files/public/',
    );
    resolved = resolved.replace(
      /(src|href)="(\/[^"]+)"/g,
      (match, attr, url) => `${attr}="${baseUrl}${url}"`,
    );
    return resolved;
  }
}
