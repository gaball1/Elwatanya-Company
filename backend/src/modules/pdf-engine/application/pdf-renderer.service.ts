import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';

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
    } = {},
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext({
      locale: 'ar-EG',
      deviceScaleFactor: 2,
    });

    try {
      const page = await context.newPage();

      const baseUrl = options.baseUrl || 'http://localhost:3001';
      const normalizedHtml = this.resolveRelativeUrls(html, baseUrl);

      await page.setContent(normalizedHtml, {
        waitUntil: 'networkidle',
      });

      await page.waitForTimeout(800);

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: {
          top: options.margin?.top || '25mm',
          right: options.margin?.right || '20mm',
          bottom: options.margin?.bottom || '25mm',
          left: options.margin?.left || '20mm',
        },
        printBackground: options.printBackground ?? true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await context.close();
    }
  }

  private resolveRelativeUrls(html: string, baseUrl: string): string {
    return html.replace(
      /(src|href)="(\/[^"]+)"/g,
      (match, attr, url) => `${attr}="${baseUrl}${url}"`,
    );
  }
}
