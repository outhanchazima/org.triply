// apps/triply.api/src/modules/admin/dto/system-users-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '@org.triply/database';
import { IsEnum, IsOptional } from 'class-validator';

export class SystemUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter system users by role',
    enum: SystemRole,
    example: SystemRole.SYSTEM_ADMIN,
  })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}
