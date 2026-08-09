import { Injectable } from '@nestjs/common';
import { FileStorageProvider } from '../../domain/file-storage-provider.interface';

@Injectable()
export class StorageRegistry {
  private providers = new Map<string, FileStorageProvider>();

  register(provider: FileStorageProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): FileStorageProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Storage provider '${name}' not registered`);
    return provider;
  }

  getActive(): FileStorageProvider {
    const name = process.env.FILE_STORAGE_PROVIDER || 'local';
    return this.getProvider(name);
  }
}
