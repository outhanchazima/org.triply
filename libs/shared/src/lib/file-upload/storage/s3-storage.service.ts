import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { StorageProvider } from '../constants/file-upload.constants';
import { storageConfig } from '../config/storage.config';
import type {
  StorageService,
  StorageUploadInput,
  StorageUploadResult,
} from '../interfaces/storage-service.interface';

interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}

interface S3SdkRuntime {
  S3Client: new (config: Record<string, unknown>) => S3ClientLike;
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
}

@Injectable()
export class S3StorageService implements StorageService {
  readonly provider = StorageProvider.S3;

  private sdk: S3SdkRuntime | null = null;
  private client: S3ClientLike | null = null;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async uploadStream(input: StorageUploadInput): Promise<StorageUploadResult> {
    const client = this.getClient();
    const sdk = this.getSdk();

    const response = await client.send(
      new sdk.PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.stream,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        Metadata: input.metadata,
      }),
    );

    return {
      objectKey: input.objectKey,
      url: this.buildObjectUrl(input.objectKey),
      etag: this.extractEtag(response),
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    const client = this.getClient();
    const sdk = this.getSdk();

    await client.send(
      new sdk.DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }

  private get bucket(): string {
    const bucket = this.config.s3.bucket;

    if (!bucket) {
      throw new Error('S3 bucket is not configured');
    }

    return bucket;
  }

  private getClient(): S3ClientLike {
    this.initializeClient();

    if (this.client) {
      return this.client;
    }

    throw new Error('Failed to initialize S3 client');
  }

  private getSdk(): S3SdkRuntime {
    this.initializeClient();

    if (this.sdk) {
      return this.sdk;
    }

    throw new Error('Failed to initialize S3 SDK');
  }

  private loadSdk(): S3SdkRuntime {
    try {
      const sdk = require('@aws-sdk/client-s3') as S3SdkRuntime;
      return sdk;
    } catch {
      throw new Error(
        'S3 provider requires @aws-sdk/client-s3. Install it before enabling STORAGE_PROVIDER=s3.',
      );
    }
  }

  private extractEtag(response: unknown): string | undefined {
    if (
      response &&
      typeof response === 'object' &&
      'ETag' in response &&
      typeof (response as Record<string, unknown>).ETag === 'string'
    ) {
      return (response as Record<string, string>).ETag;
    }

    return undefined;
  }

  private initializeClient(): void {
    if (this.client && this.sdk) {
      return;
    }

    if (!this.config.s3.isConfigured) {
      throw new Error(
        'S3 storage requested but not configured. Set S3_* environment variables.',
      );
    }

    const sdk = this.loadSdk();
    this.sdk = sdk;
    this.client = new sdk.S3Client({
      endpoint: this.config.s3.endpoint || undefined,
      region: this.config.s3.region,
      forcePathStyle: this.config.s3.forcePathStyle,
      credentials: {
        accessKeyId: this.config.s3.accessKey || '',
        secretAccessKey: this.config.s3.secretKey || '',
      },
    });
  }

  private buildObjectUrl(objectKey: string): string {
    const encodedKey = encodeURI(objectKey.replace(/\\/g, '/'));

    if (this.config.s3.publicUrl) {
      return `${this.config.s3.publicUrl.replace(/\/+$/, '')}/${encodedKey}`;
    }

    if (!this.config.s3.endpoint) {
      return `https://${this.bucket}.s3.${this.config.s3.region}.amazonaws.com/${encodedKey}`;
    }

    const endpoint = new URL(this.config.s3.endpoint);
    const endpointPath = endpoint.pathname.replace(/\/+$/, '');

    if (this.config.s3.forcePathStyle) {
      return `${endpoint.protocol}//${endpoint.host}${endpointPath}/${this.bucket}/${encodedKey}`;
    }

    return `${endpoint.protocol}//${this.bucket}.${endpoint.host}${endpointPath}/${encodedKey}`;
  }
}
