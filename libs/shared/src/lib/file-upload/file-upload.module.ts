import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  MulterModule,
  type MulterModuleOptions,
} from '@nestjs/platform-express';
import { AuthDatabaseModule } from '@org.triply/database';
import { STORAGE_SERVICE } from './constants/file-upload.constants';
import { storageConfig } from './config/storage.config';
import type { StorageService } from './interfaces/storage-service.interface';
import { ParseMongoIdPipe } from './pipes/parse-mongo-id.pipe';
import { FileStorageModule } from './storage/storage.module';
import { StreamingMulterStorage } from './storage/streaming-multer.storage';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [
    AuthDatabaseModule,
    FileStorageModule,
    ConfigModule.forFeature(storageConfig),
    MulterModule.registerAsync({
      imports: [FileStorageModule, ConfigModule.forFeature(storageConfig)],
      inject: [storageConfig.KEY, STORAGE_SERVICE],
      useFactory: (
        config: ConfigType<typeof storageConfig>,
        storageService: StorageService,
      ): MulterModuleOptions => {
        const allowedMimeTypes = new Set(config.allowedMimeTypes);

        return {
          limits: {
            fileSize: config.maxFileSizeBytes,
            files: 1,
          },
          fileFilter: (
            _request: unknown,
            file: { mimetype: string },
            callback: (error: Error | null, acceptFile: boolean) => void,
          ): void => {
            callback(null, allowedMimeTypes.has(file.mimetype));
          },
          storage: new StreamingMulterStorage(storageService, {
            defaultFolder: config.defaultFolder,
            allowedMimeTypes,
          }) as unknown as MulterModuleOptions['storage'],
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, ParseMongoIdPipe],
  exports: [FilesService],
})
export class FileUploadModule {}
