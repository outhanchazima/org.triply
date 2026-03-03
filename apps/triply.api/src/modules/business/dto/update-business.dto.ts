// apps/triply.api/src/modules/business/dto/update-business.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateBusinessDto {
  @ApiPropertyOptional({
    description: 'Business display name',
    example: 'Triply Travel Limited',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Business website URL',
    example: 'https://triply.example.com',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiPropertyOptional({
    description: 'Industry of the business',
    example: 'Travel and Hospitality',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Business logo URL',
    example: 'https://cdn.example.com/logo.png',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;
}
