import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { FILE_UPLOAD_FIELD_NAME } from './constants/file-upload.constants';
import {
  FileDeleteResponseDto,
  FileUploadResponseDto,
} from './dto/upload-file-response.dto';
import type { UploadedStoredFile } from './interfaces/uploaded-stored-file.interface';
import { ParseMongoIdPipe } from './pipes/parse-mongo-id.pipe';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor(FILE_UPLOAD_FIELD_NAME))
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description:
      'Optional target folder, e.g. users/123/documents or products/999/images',
    example: 'users/65f5d112f2ea35f6a2d770f0/documents',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [FILE_UPLOAD_FIELD_NAME],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file to configured object storage' })
  @ApiResponse({ status: 201, type: FileUploadResponseDto })
  async uploadFile(
    @UploadedFile() file: UploadedStoredFile | undefined,
  ): Promise<FileUploadResponseDto> {
    const created = await this.filesService.registerUploadedFile(file);
    return this.filesService.toResponseDto(created);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get uploaded file metadata by ID' })
  @ApiResponse({ status: 200, type: FileUploadResponseDto })
  async getFileMetadata(
    @Param('id', ParseMongoIdPipe) fileId: string,
  ): Promise<FileUploadResponseDto> {
    return this.filesService.getFileMetadata(fileId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete file metadata and the corresponding object from storage',
  })
  @ApiResponse({ status: 200, type: FileDeleteResponseDto })
  async deleteFile(
    @Param('id', ParseMongoIdPipe) fileId: string,
  ): Promise<FileDeleteResponseDto> {
    return this.filesService.deleteFile(fileId);
  }
}
