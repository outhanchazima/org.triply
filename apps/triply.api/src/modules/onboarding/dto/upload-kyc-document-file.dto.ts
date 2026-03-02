import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { KycDocumentType } from '@org.triply/database';

export class UploadKycDocumentFileDto {
  @ApiProperty({
    description: 'KYC document type for the uploaded file',
    enum: KycDocumentType,
    example: KycDocumentType.DIRECTOR_ID,
  })
  @IsEnum(KycDocumentType)
  type!: KycDocumentType;
}
