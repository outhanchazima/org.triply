import { Readable } from 'node:stream';
import { StorageProvider } from '../constants/file-upload.constants';

export interface StorageUploadInput {
  objectKey: string;
  stream: Readable;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  objectKey: string;
  url: string;
  etag?: string;
}

export interface StorageService {
  readonly provider: StorageProvider;
  uploadStream(input: StorageUploadInput): Promise<StorageUploadResult>;
  deleteObject(objectKey: string): Promise<void>;
}
