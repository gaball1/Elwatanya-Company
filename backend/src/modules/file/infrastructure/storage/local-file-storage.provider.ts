import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync, ReadStream } from 'fs';
import { join } from 'path';
import { FileStorageProvider } from '../../domain/file-storage-provider.interface';

@Injectable()
export class LocalFileStorageProvider implements FileStorageProvider {
  readonly name = 'local';
  private readonly basePath = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  async save(buffer: Buffer, path: string, _mimeType: string): Promise<string> {
    const fullPath = join(this.basePath, path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('\\'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, buffer);
    return path;
  }

  async read(path: string): Promise<ReadStream> {
    const fullPath = join(this.basePath, path);
    if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
    return createReadStream(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    if (existsSync(fullPath)) unlinkSync(fullPath);
  }

  getUrl(fileId: string, _path?: string): string {
    return `/api/v1/files/download/${fileId}`;
  }
}
