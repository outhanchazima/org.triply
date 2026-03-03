// apps/triply.api/src/modules/business/dto/list-business-approvals-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminApprovalStatus } from '@org.triply/database';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ListBusinessApprovalsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by approval status',
    enum: AdminApprovalStatus,
    example: AdminApprovalStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AdminApprovalStatus)
  status?: AdminApprovalStatus;

  @ApiPropertyOptional({
    description: 'Filter by action key',
    example: 'finance:export',
  })
  @IsOptional()
  @IsString()
  actionKey?: string;

  @ApiPropertyOptional({ description: 'Page number', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Page size', example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
