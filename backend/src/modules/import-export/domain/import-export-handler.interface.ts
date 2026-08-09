export enum FormatType {
  EXCEL = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

export interface ImportExportHandler {
  readonly entityType: string;
  readonly supportedFormats: FormatType[];
  validate(row: Record<string, any>, index: number): Promise<ValidationError[]>;
  import(row: Record<string, any>): Promise<ImportResult>;
  exportData(filter?: Record<string, any>): Promise<Record<string, any>[]>;
  exportHeaders(): ExportColumn[];
}

export interface ExportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
}

export interface ImportResult {
  success: boolean;
  entityId?: string;
  errors?: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}
