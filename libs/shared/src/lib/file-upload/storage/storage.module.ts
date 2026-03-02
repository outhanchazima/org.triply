import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  STORAGE_SERVICE,
  StorageProvider,
} from '../constants/file-upload.constants';
import { storageConfig } from '../config/storage.config';
import type { StorageService } from '../interfaces/storage-service.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  providers: [
    S3StorageService,
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [storageConfig.KEY, S3StorageService, LocalStorageService],
      useFactory: (
        config: ConfigType<typeof storageConfig>,
        s3StorageService: S3StorageService,
        localStorageService: LocalStorageService,
      ): StorageService => {
        const shouldUseS3 =
          config.provider === StorageProvider.S3 && config.s3.isConfigured;

        return shouldUseS3 ? s3StorageService : localStorageService;
      },
    },
  ],
  exports: [STORAGE_SERVICE, S3StorageService, LocalStorageService],
})
export class FileStorageModule {}
