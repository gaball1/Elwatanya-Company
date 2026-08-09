declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    scale?: number;
    color?: { dark?: string; light?: string };
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    rendererOpts?: Record<string, unknown>;
  }

  export interface QRCodeToStringOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    type?: 'utf8' | 'svg' | 'terminal';
    width?: number;
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;
  export function toString(
    text: string,
    options?: QRCodeToStringOptions,
  ): Promise<string>;
}
