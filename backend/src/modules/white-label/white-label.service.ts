import { Injectable } from '@nestjs/common';
import { CompanySettings } from '../settings/accessors/company-settings';
import { BrandingSettings } from '../settings/accessors/branding-settings';
import { ThemeSettings } from '../settings/accessors/theme-settings';

export interface WhiteLabelResponse {
  company: {
    name: string;
    arabicName: string;
    logo: string;
    favicon: string;
    address: string;
    phone: string;
    email: string;
    taxNumber: string;
    commercialRegister: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    watermark: string;
    qrCodeUrl: string;
    stampUrl: string;
    digitalStampUrl: string;
    signatureUrl: string;
  };
  theme: {
    direction: 'rtl' | 'ltr';
    fontFamily: string;
    fontFamilyArabic: string;
    fontFamilyEnglish: string;
    fontSize: string;
    borderRadius: string;
    sidebarCollapsed: boolean;
  };
  cssVariables: Record<string, string>;
}

@Injectable()
export class WhiteLabelService {
  constructor(
    private readonly company: CompanySettings,
    private readonly branding: BrandingSettings,
    private readonly theme: ThemeSettings,
  ) {}

  async getBranding(): Promise<WhiteLabelResponse> {
    const [companyData, brandingData, themeData] = await Promise.all([
      this.loadCompany(),
      this.loadBranding(),
      this.loadTheme(),
    ]);

    return {
      company: companyData,
      branding: brandingData,
      theme: themeData,
      cssVariables: this.buildCssVariables(themeData, brandingData),
    };
  }

  private async loadCompany() {
    const [name, arabicName, logo, favicon, address, phone, email, taxNumber, commercialRegister] = await Promise.all([
      this.company.name,
      this.company.arabicName,
      this.company.logo,
      this.company.favicon,
      this.company.address,
      this.company.phone,
      this.company.email,
      this.company.taxNumber,
      this.company.commercialRegister,
    ]);
    return { name, arabicName, logo, favicon, address, phone, email, taxNumber, commercialRegister };
  }

  private async loadBranding() {
    const [primaryColor, secondaryColor, logoUrl, faviconUrl, watermark, qrCodeUrl, stampUrl, digitalStampUrl, signatureUrl] = await Promise.all([
      this.branding.primaryColor,
      this.branding.secondaryColor,
      this.branding.logoUrl,
      this.branding.faviconUrl,
      this.branding.watermark,
      this.branding.qrCodeUrl,
      this.branding.stampUrl,
      this.branding.digitalStampUrl,
      this.branding.signatureUrl,
    ]);
    return { primaryColor, secondaryColor, logoUrl, faviconUrl, watermark, qrCodeUrl, stampUrl, digitalStampUrl, signatureUrl };
  }

  private async loadTheme() {
    const [direction, fontFamily, fontFamilyArabic, fontFamilyEnglish, fontSize, sidebarCollapsed, borderRadius] = await Promise.all([
      this.theme.direction,
      this.theme.fontFamily,
      this.theme.fontFamilyArabic,
      this.theme.fontFamilyEnglish,
      this.theme.fontSize,
      this.theme.sidebarCollapsed,
      this.theme.borderRadius,
    ]);
    return { direction: direction as 'rtl' | 'ltr', fontFamily, fontFamilyArabic, fontFamilyEnglish, fontSize, sidebarCollapsed, borderRadius };
  }

  private buildCssVariables(theme: any, branding: any): Record<string, string> {
    return {
      '--primary': branding.primaryColor,
      '--primary-foreground': this.contrastText(branding.primaryColor),
      '--secondary': branding.secondaryColor,
      '--secondary-foreground': this.contrastText(branding.secondaryColor),
      '--font-family': theme.fontFamily,
      '--font-family-arabic': theme.fontFamilyArabic,
      '--font-family-english': theme.fontFamilyEnglish,
      '--font-size': theme.fontSize,
      '--border-radius': theme.borderRadius,
      '--direction': theme.direction,
    };
  }

  private contrastText(hex: string): string {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16) || 0;
    const g = parseInt(color.substring(2, 4), 16) || 0;
    const b = parseInt(color.substring(4, 6), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
