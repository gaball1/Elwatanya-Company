export interface FormatProvider {
  readonly format: string;
  readonly mimeType: string;
  parse(buffer: Buffer): Promise<Record<string, any>[]>;
  stringify(data: Record<string, any>[], columns: { key: string; label: string }[]): Promise<Buffer>;
}
