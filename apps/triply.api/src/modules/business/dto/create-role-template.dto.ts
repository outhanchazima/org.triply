// apps/triply.api/src/modules/business/dto/create-role-template.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { BusinessRole, Permission } from '@org.triply/database';

export class CreateRoleTemplateDto {
  @ApiProperty({
    description: 'Template name scoped to the business',
    example: 'Senior Agent Template',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional template description',
    example: 'For senior booking agents with reporting access',
  })
  @IsOptional()
  @IsString()
  @Length(2, 300)
  description?: string;

  @ApiProperty({
    description: 'Base business role to extend',
    enum: BusinessRole,
    example: BusinessRole.BUSINESS_AGENT,
  })
  @IsEnum(BusinessRole)
  baseRole!: BusinessRole;

  @ApiPropertyOptional({
    description: 'Extra permissions granted by this template',
    enum: Permission,
    isArray: true,
    example: [Permission.BOOKING_CREATE, Permission.BOOKING_UPDATE],
  })
  @IsOptional()
  @IsEnum(Permission, { each: true })
  extraPermissions?: Permission[];

  @ApiPropertyOptional({
    description: 'Permissions explicitly revoked by this template',
    enum: Permission,
    isArray: true,
    example: [Permission.FINANCE_EXPORT],
  })
  @IsOptional()
  @IsEnum(Permission, { each: true })
  deniedPermissions?: Permission[];
}
