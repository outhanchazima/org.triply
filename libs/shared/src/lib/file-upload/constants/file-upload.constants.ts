export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export enum StorageProvider {
  S3 = 's3',
  LOCAL = 'local',
}

export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export const FILE_CATEGORY_MIME_TYPES: Record<FileCategory, string[]> = {
  [FileCategory.IMAGE]: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ],
  [FileCategory.DOCUMENT]: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  [FileCategory.AUDIO]: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'],
  [FileCategory.VIDEO]: ['video/mp4'],
};

export const DEFAULT_ALLOWED_MIME_TYPES = Array.from(
  new Set(Object.values(FILE_CATEGORY_MIME_TYPES).flat()),
);

export const FILE_UPLOAD_FIELD_NAME = 'file';
export const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const DEFAULT_UPLOAD_FOLDER = 'general';
export const DEFAULT_LOCAL_UPLOAD_ROOT = 'uploads';
export const DEFAULT_LOCAL_PUBLIC_BASE_URL = '/uploads';
