// apps/triply.api/src/modules/admin/dto/update-system-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '@org.triply/database';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateSystemUserDto {
  @ApiPropertyOptional({
    description: 'New system role',
    enum: SystemRole,
    example: SystemRole.SYSTEM_ADMIN,
  })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @ApiPropertyOptional({
    description: 'Department name',
    example: 'Operations',
  })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  department?: string;

  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
