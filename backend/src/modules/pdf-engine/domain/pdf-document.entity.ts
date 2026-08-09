export interface PdfSection {
  title?: string;
  content: string;
  columns?: number;
}

export interface PdfSignature {
  label: string;
  name?: string;
  date?: string;
  imageUrl?: string;
}

export interface PdfDocumentProps {
  title: string;
  arabicTitle?: string;
  documentNumber?: string;
  version?: string;
  generatedBy: string;
  generatedAt: Date;
  sections: PdfSection[];
  signatures?: PdfSignature[];
  watermark?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter';
  qrData?: string;
  verificationHash?: string;
  locale?: 'ar' | 'en';
  logoUrl?: string;
}

export class PdfDocument {
  private props: PdfDocumentProps;

  private constructor(props: PdfDocumentProps) {
    this.props = props;
  }

  get title(): string { return this.props.title; }
  get arabicTitle(): string | undefined { return this.props.arabicTitle; }
  get documentNumber(): string | undefined { return this.props.documentNumber; }
  get version(): string | undefined { return this.props.version; }
  get generatedBy(): string { return this.props.generatedBy; }
  get generatedAt(): Date { return this.props.generatedAt; }
  get sections(): PdfSection[] { return this.props.sections; }
  get signatures(): PdfSignature[] | undefined { return this.props.signatures; }
  get watermark(): string | undefined { return this.props.watermark; }
  get orientation(): string { return this.props.orientation || 'portrait'; }
  get pageSize(): string { return this.props.pageSize || 'A4'; }
  get qrData(): string | undefined { return this.props.qrData; }
  get verificationHash(): string | undefined { return this.props.verificationHash; }
  get locale(): 'ar' | 'en' { return this.props.locale || 'ar'; }
  get logoUrl(): string | undefined { return this.props.logoUrl; }

  static create(props: PdfDocumentProps): PdfDocument {
    return new PdfDocument(props);
  }
}
