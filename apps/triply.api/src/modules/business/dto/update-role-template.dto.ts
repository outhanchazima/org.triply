// apps/triply.api/src/modules/business/dto/update-role-template.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { BusinessRole, Permission } from '@org.triply/database';

export class UpdateRoleTemplateDto {
  @ApiPropertyOptional({
    description: 'Template display name',
    example: 'Finance Readonly Template',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Readonly finance and audit permissions',
  })
  @IsOptional()
  @IsString()
  @Length(2, 300)
  description?: string;

  @ApiPropertyOptional({
    description: 'Base business role to extend',
    enum: BusinessRole,
    example: BusinessRole.BUSINESS_FINANCE,
  })
  @IsOptional()
  @IsEnum(BusinessRole)
  baseRole?: BusinessRole;

  @ApiPropertyOptional({
    description: 'Extra permissions granted by this template',
    enum: Permission,
    isArray: true,
    example: [Permission.FINANCE_READ],
  })
  @IsOptional()
  @IsEnum(Permission, { each: true })
  extraPermissions?: Permission[];

  @ApiPropertyOptional({
    description: 'Permissions explicitly revoked by this template',
    enum: Permission,
    isArray: true,
    example: [Permission.FINANCE_MANAGE],
  })
  @IsOptional()
  @IsEnum(Permission, { each: true })
  deniedPermissions?: Permission[];

  @ApiPropertyOptional({
    description: 'Whether template is active for reuse',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
