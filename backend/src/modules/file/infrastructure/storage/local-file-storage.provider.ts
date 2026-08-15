import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync, ReadStream } from 'fs';
import { join, resolve, sep } from 'path';
import { FileStorageProvider } from '../../domain/file-storage-provider.interface';

@Injectable()
export class LocalFileStorageProvider implements FileStorageProvider {
  readonly name = 'local';
  private readonly basePath = resolve(join(process.cwd(), 'uploads'));

  constructor() {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  /** Resolves a relative path and enforces it stays inside the uploads base dir. */
  private resolveInsideBase(path: string): string {
    // resolve() treats an absolute `path` as already final, so an absolute
    // path can never land inside the uploads directory (defends both "../"
    // traversal and absolute-path injection).
    const fullPath = resolve(this.basePath, path);
    if (!fullPath.startsWith(this.basePath + sep)) {
      throw new Error(`Path escapes the uploads directory: ${path}`);
    }
    return fullPath;
  }

  async save(buffer: Buffer, path: string, _mimeType: string): Promise<string> {
    const fullPath = this.resolveInsideBase(path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf(sep));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, buffer);
    return path;
  }

  async read(path: string): Promise<ReadStream> {
    const fullPath = this.resolveInsideBase(path);
    if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
    return createReadStream(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.resolveInsideBase(path);
    if (existsSync(fullPath)) unlinkSync(fullPath);
  }

  getUrl(fileId: string, path?: string): string {
    // Company branding assets are served via the public route so they can be
    // embedded in PDFs and displayed in the frontend without a token.
    if (path && path.startsWith('company/')) {
      return `/api/v1/files/public/${fileId}`;
    }
    return `/api/v1/files/download/${fileId}`;
  }
}
