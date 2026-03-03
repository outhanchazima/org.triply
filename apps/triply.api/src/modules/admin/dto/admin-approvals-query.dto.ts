// apps/triply.api/src/modules/admin/dto/admin-approvals-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  AdminApprovalActionType,
  AdminApprovalStatus,
  ApprovalScope,
} from '@org.triply/database';

export class AdminApprovalsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter approvals by status',
    enum: AdminApprovalStatus,
    example: AdminApprovalStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AdminApprovalStatus)
  status?: AdminApprovalStatus;

  @ApiPropertyOptional({
    description: 'Filter approvals by action type',
    enum: AdminApprovalActionType,
    example: AdminApprovalActionType.SUSPEND_BUSINESS,
  })
  @IsOptional()
  @IsEnum(AdminApprovalActionType)
  actionType?: AdminApprovalActionType;

  @ApiPropertyOptional({
    description: 'Filter approvals by action key',
    example: 'finance:export',
  })
  @IsOptional()
  @IsString()
  actionKey?: string;

  @ApiPropertyOptional({
    description: 'Filter approvals by scope',
    enum: ApprovalScope,
    example: ApprovalScope.BUSINESS,
  })
  @IsOptional()
  @IsEnum(ApprovalScope)
  scope?: ApprovalScope;

  @ApiPropertyOptional({
    description: 'Filter by business ID for business-scope requests',
    example: '65f4ab129901f6ab3c7a8d11',
  })
  @IsOptional()
  @IsMongoId()
  businessId?: string;

  @ApiPropertyOptional({ description: 'Page number', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Page size', example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
