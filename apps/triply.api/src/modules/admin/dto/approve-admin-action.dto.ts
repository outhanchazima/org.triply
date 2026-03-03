// apps/triply.api/src/modules/admin/dto/approve-admin-action.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ApproveAdminActionDto {
  @ApiPropertyOptional({
    description: 'Optional approval note',
    example: 'Reviewed and approved after business SLA check.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 500)
  note?: string;
}
