import { randomUUID } from 'node:crypto';
import { Readable, Transform, type TransformCallback } from 'node:stream';
import type { Request } from 'express';
import type { StorageService } from '../interfaces/storage-service.interface';
import type { UploadedStoredFile } from '../interfaces/uploaded-stored-file.interface';
import {
  buildObjectKey,
  resolveExtension,
  resolveUploadFolder,
  sanitizeFilename,
} from '../utils/file-upload.util';

interface IncomingFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  stream: Readable;
}

type MulterStorageCallback = (
  error: Error | null,
  info?: Partial<UploadedStoredFile>,
) => void;

interface StreamingMulterStorageOptions {
  defaultFolder: string;
  allowedMimeTypes: Set<string>;
}

export class StreamingMulterStorage {
  constructor(
    private readonly storageService: StorageService,
    private readonly options: StreamingMulterStorageOptions,
  ) {}

  _handleFile(
    request: Request,
    file: IncomingFile,
    callback: MulterStorageCallback,
  ): void {
    if (!this.options.allowedMimeTypes.has(file.mimetype)) {
      callback(null);
      return;
    }

    const originalName = sanitizeFilename(file.originalname);
    const extension = resolveExtension(originalName, file.mimetype);
    const filename = extension ? `${randomUUID()}.${extension}` : randomUUID();
    const folder = resolveUploadFolder(request, this.options.defaultFolder);
    const objectKey = buildObjectKey(folder, filename);

    let size = 0;

    const counter = new Transform({
      transform(
        chunk: Buffer | string,
        _encoding: BufferEncoding,
        done: TransformCallback,
      ): void {
        size += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk);
        done(null, chunk);
      },
    });

    const stream = (file.stream as Readable).pipe(counter);

    this.storageService
      .uploadStream({
        objectKey,
        stream,
        contentType: file.mimetype,
        metadata: {
          originalName,
        },
      })
      .then((result) => {
        callback(null, {
          fieldname: file.fieldname,
          originalname: originalName,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size,
          filename,
          folder,
          objectKey,
          url: result.url,
          path: result.url,
          location: result.url,
          storageProvider: this.storageService.provider,
        });
      })
      .catch((error: unknown) => {
        callback(error as Error);
      });
  }

  _removeFile(
    _request: Request,
    file: UploadedStoredFile,
    callback: (error: Error | null) => void,
  ): void {
    if (!file?.objectKey) {
      callback(null);
      return;
    }

    this.storageService
      .deleteObject(file.objectKey)
      .then(() => callback(null))
      .catch((error: unknown) => callback(error as Error));
  }
}
