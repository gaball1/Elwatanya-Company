import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FILE_REPOSITORY } from './domain/file.repository';
import { PrismaFileRepository } from './infrastructure/prisma-file.repository';
import { StorageRegistry } from './infrastructure/storage/storage-registry.service';
import { LocalFileStorageProvider } from './infrastructure/storage/local-file-storage.provider';
import { FileService } from './file.service';
import { FileController } from './file.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FileController],
  providers: [
    { provide: FILE_REPOSITORY, useClass: PrismaFileRepository },
    StorageRegistry,
    LocalFileStorageProvider,
    {
      provide: 'FILE_STORAGE_LOCAL',
      useExisting: LocalFileStorageProvider,
    },
    FileService,
  ],
  exports: [FileService, StorageRegistry],
})
export class FileModule {
  constructor(
    private readonly storageRegistry: StorageRegistry,
    private readonly localProvider: LocalFileStorageProvider,
  ) {
    this.storageRegistry.register(this.localProvider);
  }
}
