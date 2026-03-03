// apps/triply.api/src/modules/admin/dto/upsert-system-approval-policy.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalMode, SystemRole } from '@org.triply/database';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class UpsertSystemApprovalPolicyDto {
  @ApiPropertyOptional({
    description: 'Approval mode for the system action',
    enum: ApprovalMode,
    example: ApprovalMode.SECOND_APPROVAL,
  })
  @IsOptional()
  @IsEnum(ApprovalMode)
  mode?: ApprovalMode;

  @ApiPropertyOptional({
    description:
      'System roles allowed to approve pending requests for this action',
    enum: SystemRole,
    isArray: true,
    example: [SystemRole.SYSTEM_ADMIN, SystemRole.SUPER_USER],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SystemRole, { each: true })
  systemApproverRoles?: SystemRole[];

  @ApiPropertyOptional({
    description: 'Whether the policy is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
