import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileAssetDocument, FileAssetRepository } from '@org.triply/database';
import { STORAGE_SERVICE } from './constants/file-upload.constants';
import {
  FileDeleteResponseDto,
  FileUploadResponseDto,
} from './dto/upload-file-response.dto';
import { StorageProvider } from './constants/file-upload.constants';
import type { StorageService } from './interfaces/storage-service.interface';
import type { UploadedStoredFile } from './interfaces/uploaded-stored-file.interface';
import { buildObjectKey } from './utils/file-upload.util';

@Injectable()
export class FilesService {
  constructor(
    private readonly fileAssetRepository: FileAssetRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async registerUploadedFile(
    uploadedFile: UploadedStoredFile | undefined,
  ): Promise<FileAssetDocument> {
    if (!uploadedFile) {
      throw new BadRequestException(
        'File is required and must match allowed MIME types',
      );
    }

    return this.fileAssetRepository.create({
      originalName: uploadedFile.originalname,
      filename: uploadedFile.filename,
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      folder: uploadedFile.folder,
      storageProvider: uploadedFile.storageProvider,
      url: uploadedFile.url,
    } as Partial<FileAssetDocument>);
  }

  async getFileMetadata(fileId: string): Promise<FileUploadResponseDto> {
    const file = await this.fileAssetRepository.findById(fileId);

    if (!file) {
      throw new NotFoundException('File metadata not found');
    }

    return this.toResponseDto(file);
  }

  async deleteFile(
    fileId: string,
    options?: { suppressNotFound?: boolean },
  ): Promise<FileDeleteResponseDto> {
    const file = await this.fileAssetRepository.findById(fileId);

    if (!file) {
      if (options?.suppressNotFound) {
        return {
          id: fileId,
          deleted: false,
        };
      }

      throw new NotFoundException('File metadata not found');
    }

    const objectKey = buildObjectKey(file.folder, file.filename);
    await this.storageService.deleteObject(objectKey);
    await this.fileAssetRepository.removeById(fileId);

    return {
      id: fileId,
      deleted: true,
    };
  }

  toResponseDto(file: FileAssetDocument): FileUploadResponseDto {
    return {
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      folder: file.folder,
      storageProvider: file.storageProvider as StorageProvider,
      url: file.url,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
