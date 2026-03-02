import { registerAs } from '@nestjs/config';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_LOCAL_PUBLIC_BASE_URL,
  DEFAULT_LOCAL_UPLOAD_ROOT,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_UPLOAD_FOLDER,
  StorageProvider,
} from '../constants/file-upload.constants';
import { sanitizeFolderPath } from '../utils/file-upload.util';

export interface StorageRuntimeConfig {
  provider: StorageProvider;
  maxFileSizeBytes: number;
  defaultFolder: string;
  allowedMimeTypes: string[];
  local: {
    rootDir: string;
    publicBaseUrl: string;
  };
  s3: {
    endpoint: string | null;
    bucket: string | null;
    region: string;
    accessKey: string | null;
    secretKey: string | null;
    forcePathStyle: boolean;
    publicUrl: string | null;
    isConfigured: boolean;
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export const storageConfig = registerAs('storage', (): StorageRuntimeConfig => {
  const providerInput = (process.env.STORAGE_PROVIDER || '')
    .trim()
    .toLowerCase();

  const provider =
    providerInput === StorageProvider.S3
      ? StorageProvider.S3
      : StorageProvider.LOCAL;

  const configuredMimeTypes = parseList(
    process.env.FILE_UPLOAD_ALLOWED_MIME_TYPES,
  );
  const extraMimeTypes = parseList(process.env.FILE_UPLOAD_EXTRA_MIME_TYPES);
  const baseMimeTypes =
    configuredMimeTypes.length > 0
      ? configuredMimeTypes
      : DEFAULT_ALLOWED_MIME_TYPES;

  const allowedMimeTypes = Array.from(
    new Set([...baseMimeTypes, ...extraMimeTypes]),
  );

  const bucket = process.env.S3_BUCKET?.trim() || null;
  const accessKey = process.env.S3_ACCESS_KEY?.trim() || null;
  const secretKey = process.env.S3_SECRET_KEY?.trim() || null;

  return {
    provider,
    maxFileSizeBytes: parsePositiveInt(
      process.env.FILE_UPLOAD_MAX_SIZE,
      DEFAULT_MAX_UPLOAD_BYTES,
    ),
    defaultFolder: sanitizeFolderPath(
      process.env.FILE_UPLOAD_DEFAULT_FOLDER || DEFAULT_UPLOAD_FOLDER,
      DEFAULT_UPLOAD_FOLDER,
    ),
    allowedMimeTypes,
    local: {
      rootDir:
        process.env.LOCAL_UPLOAD_ROOT?.trim() || DEFAULT_LOCAL_UPLOAD_ROOT,
      publicBaseUrl:
        process.env.LOCAL_UPLOAD_BASE_URL?.trim() ||
        DEFAULT_LOCAL_PUBLIC_BASE_URL,
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT?.trim() || null,
      bucket,
      region: process.env.S3_REGION?.trim() || 'us-east-1',
      accessKey,
      secretKey,
      forcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, false),
      publicUrl: process.env.S3_PUBLIC_URL?.trim() || null,
      isConfigured: Boolean(bucket && accessKey && secretKey),
    },
  };
});
