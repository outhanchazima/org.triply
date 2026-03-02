import { ApiProperty } from '@nestjs/swagger';
import { StorageProvider } from '../constants/file-upload.constants';

export class FileUploadResponseDto {
  @ApiProperty({ example: '65f5d112f2ea35f6a2d770f0' })
  id!: string;

  @ApiProperty({ example: 'passport.pdf' })
  originalName!: string;

  @ApiProperty({ example: '6a4f756a-f76e-460f-b718-f9f5a0d22d8f.pdf' })
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  size!: number;

  @ApiProperty({ example: 'users/65f5d112f2ea35f6a2d770f0/documents' })
  folder!: string;

  @ApiProperty({ enum: StorageProvider, example: StorageProvider.S3 })
  storageProvider!: StorageProvider;

  @ApiProperty({
    example:
      'https://bucket.s3.us-east-1.amazonaws.com/users/65f5d112f2ea35f6a2d770f0/documents/6a4f756a-f76e-460f-b718-f9f5a0d22d8f.pdf',
  })
  url!: string;

  @ApiProperty({ example: '2026-03-02T13:08:12.186Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-02T13:08:12.186Z' })
  updatedAt!: Date;
}

export class FileDeleteResponseDto {
  @ApiProperty({ example: '65f5d112f2ea35f6a2d770f0' })
  id!: string;

  @ApiProperty({ example: true })
  deleted!: boolean;
}
