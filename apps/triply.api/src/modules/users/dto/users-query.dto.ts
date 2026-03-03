// apps/triply.api/src/modules/users/dto/users-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UsersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter users by email (contains match)',
    example: 'admin@',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by traveller users',
    example: true,
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === 'true' || value === true,
  )
  @IsBoolean()
  isTraveller?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by system users',
    example: false,
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === 'true' || value === true,
  )
  @IsBoolean()
  isSystemUser?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by active state',
    example: true,
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === 'true' || value === true,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Page size',
    example: '20',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
