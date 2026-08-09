import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class RenderPdfTool extends BaseTool {
  readonly name = 'render_pdf';
  readonly description = 'Render a professional PDF document with company branding, header, footer, page numbers, watermark, and signatures. Provide title, sections (each with title and content), and optional signatures.';
  readonly requiresPermission = null;
  readonly requiredEntity = null;

  async execute(args: Record<string, any>, user: any): Promise<any> {
    if (!args.title) return this.fail('title is required');
    if (!args.sections || !Array.isArray(args.sections) || args.sections.length === 0) {
      return this.fail('sections array is required with at least one entry');
    }

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/pdf/render`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({
            title: args.title,
            arabicTitle: args.arabicTitle,
            documentNumber: args.documentNumber,
            version: args.version,
            generatedBy: user.email || args.generatedBy || 'System',
            sections: args.sections,
            signatures: args.signatures,
            watermark: args.watermark,
            orientation: args.orientation || 'portrait',
            pageSize: args.pageSize || 'A4',
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        return this.fail(`PDF rendering failed: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'document.pdf';

      return this.success({ filename, data: base64, size: buffer.byteLength });
    } catch {
      return this.fail('PDF rendering failed');
    }
  }
}
