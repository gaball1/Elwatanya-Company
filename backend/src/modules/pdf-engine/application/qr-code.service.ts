import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  async generateDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 260,
      color: { dark: '#1e293b', light: '#ffffff' },
    });
  }
}
