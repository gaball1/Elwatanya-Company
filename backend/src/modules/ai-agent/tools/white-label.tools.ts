import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetWhiteLabelBrandingTool extends BaseTool {
  readonly name = 'get_white_label_branding';
  readonly description = 'Get company white-label branding: colors, logos, fonts, theme, and CSS variables for the frontend';
  readonly requiresPermission = 'settings.read';
  readonly requiredEntity = 'branding';

  async execute(_args: Record<string, any>, user: any): Promise<any> {
    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/white-label/branding`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('White label branding unavailable');
    }
  }
}

@Injectable()
export class UpdateWhiteLabelBrandingTool extends BaseTool {
  readonly name = 'update_white_label_branding';
  readonly description = 'Update company branding: primary color, secondary color, logo, favicon, watermark, QR code, stamp, digital stamp, signature';
  readonly requiresPermission = 'settings.write';
  readonly requiredEntity = 'branding';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const brandingFields = ['primaryColor', 'secondaryColor', 'logoUrl', 'faviconUrl', 'watermark', 'qrCodeUrl', 'stampUrl', 'digitalStampUrl', 'signatureUrl'];
    const updateData: Record<string, any> = {};

    for (const field of brandingFields) {
      if (args[field] !== undefined) updateData[field] = args[field];
    }

    if (Object.keys(updateData).length === 0) return this.fail('No branding fields to update');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/settings/branding`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ values: updateData }),
        },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Branding update failed');
    }
  }
}
