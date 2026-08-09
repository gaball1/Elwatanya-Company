import { ReadStream } from 'fs';

export interface FileStorageProvider {
  readonly name: string;
  save(buffer: Buffer, path: string, mimeType: string): Promise<string>;
  read(path: string): Promise<ReadStream>;
  delete(path: string): Promise<void>;
  getUrl(fileId: string, path: string): string;
}
