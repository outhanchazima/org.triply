import { createWriteStream, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { StorageProvider } from '../constants/file-upload.constants';
import { storageConfig } from '../config/storage.config';
import type {
  StorageService,
  StorageUploadInput,
  StorageUploadResult,
} from '../interfaces/storage-service.interface';

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  readonly provider = StorageProvider.LOCAL;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }
  }

  async uploadStream(input: StorageUploadInput): Promise<StorageUploadResult> {
    const absolutePath = this.resolveAbsolutePath(input.objectKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await pipeline(input.stream, createWriteStream(absolutePath));

    return {
      objectKey: input.objectKey,
      url: this.buildPublicUrl(input.objectKey),
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(objectKey);

    try {
      await unlink(absolutePath);
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  clearObjectSync(objectKey: string): void {
    const absolutePath = this.resolveAbsolutePath(objectKey);

    if (!existsSync(absolutePath)) {
      return;
    }

    unlinkSync(absolutePath);
  }

  private get rootDir(): string {
    return resolve(this.config.local.rootDir);
  }

  private resolveAbsolutePath(objectKey: string): string {
    const normalizedKey = objectKey.replace(/\\/g, '/');
    const absolutePath = resolve(this.rootDir, normalizedKey);

    if (
      absolutePath !== this.rootDir &&
      !absolutePath.startsWith(`${this.rootDir}${sep}`)
    ) {
      throw new Error('Invalid object key path');
    }

    return absolutePath;
  }

  private buildPublicUrl(objectKey: string): string {
    const normalizedKey = objectKey.replace(/\\/g, '/');
    const encodedKey = encodeURI(normalizedKey);
    const base = this.config.local.publicBaseUrl.replace(/\/+$/, '');

    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base}/${encodedKey}`;
    }

    if (base.startsWith('/')) {
      return `${base}/${encodedKey}`;
    }

    return `/${base}/${encodedKey}`;
  }
}
