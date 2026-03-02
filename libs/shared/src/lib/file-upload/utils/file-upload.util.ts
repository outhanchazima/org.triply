import { basename, extname } from 'node:path';
import type { Request } from 'express';
import { DEFAULT_UPLOAD_FOLDER } from '../constants/file-upload.constants';
import { sanitizeFileName, stripSpecialChars } from '../../utils/sanitize.util';
import { normalizeWhitespace } from '../../utils/string.util';

const SAFE_FILE_ALLOWLIST = '._- ';
const SAFE_FOLDER_ALLOWLIST = '._- ';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
};

function getFirstString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return null;
}

export function sanitizeFilename(originalName: string): string {
  const raw = basename(normalizeWhitespace(originalName || 'file'));
  const baseSafe = sanitizeFileName(raw);
  const ascii = Array.from(baseSafe.normalize('NFKD'))
    .filter((char) => char.charCodeAt(0) <= 0x7f)
    .join('');
  const compact = normalizeWhitespace(ascii).replace(/\s+/g, '-');
  const sanitized = stripSpecialChars(compact, SAFE_FILE_ALLOWLIST);

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'file';
  }

  return sanitized.slice(0, 255);
}

export function sanitizeFolderPath(
  folderPath: string,
  fallback = DEFAULT_UPLOAD_FOLDER,
): string {
  const normalized = (folderPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');

  const parts = normalized
    .split('/')
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0 && part !== '.' && part !== '..')
    .map((part) =>
      stripSpecialChars(part, SAFE_FOLDER_ALLOWLIST).replace(/\s+/g, '-'),
    )
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return fallback;
  }

  return parts.join('/');
}

export function resolveExtension(
  sanitizedOriginalName: string,
  mimeType: string,
): string {
  const extension = extname(sanitizedOriginalName)
    .replace('.', '')
    .toLowerCase();

  if (extension) {
    return extension;
  }

  return MIME_EXTENSION_MAP[mimeType.toLowerCase()] || '';
}

export function buildObjectKey(folder: string, filename: string): string {
  return `${sanitizeFolderPath(folder)}/${filename}`;
}

export function resolveUploadFolder(
  request: Request,
  defaultFolder: string,
): string {
  const queryFolder = getFirstString(request.query?.folder);
  if (queryFolder) {
    return sanitizeFolderPath(queryFolder, defaultFolder);
  }

  const headerFolder = getFirstString(request.headers['x-upload-folder']);
  if (headerFolder) {
    return sanitizeFolderPath(headerFolder, defaultFolder);
  }

  const bodyFolder = getFirstString(
    (request.body as Record<string, unknown> | undefined)?.folder,
  );
  if (bodyFolder) {
    return sanitizeFolderPath(bodyFolder, defaultFolder);
  }

  const businessId = getFirstString(request.params?.businessId);
  const isKycUploadRequest =
    typeof request.originalUrl === 'string' &&
    request.originalUrl.includes('/kyc/documents/upload');

  if (businessId && isKycUploadRequest) {
    return sanitizeFolderPath(
      `businesses/${businessId}/kyc/documents`,
      defaultFolder,
    );
  }

  return sanitizeFolderPath(defaultFolder, defaultFolder);
}
