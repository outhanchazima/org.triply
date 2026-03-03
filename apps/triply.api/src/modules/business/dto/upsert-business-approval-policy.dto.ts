// apps/triply.api/src/modules/business/dto/upsert-business-approval-policy.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalMode, BusinessRole } from '@org.triply/database';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class UpsertBusinessApprovalPolicyDto {
  @ApiPropertyOptional({
    description: 'Approval mode for this business action',
    enum: ApprovalMode,
    example: ApprovalMode.SECOND_APPROVAL,
  })
  @IsOptional()
  @IsEnum(ApprovalMode)
  mode?: ApprovalMode;

  @ApiPropertyOptional({
    description:
      'Business roles allowed to approve pending requests for this action',
    enum: BusinessRole,
    isArray: true,
    example: [BusinessRole.BUSINESS_OWNER, BusinessRole.BUSINESS_FINANCE],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(BusinessRole, { each: true })
  businessApproverRoles?: BusinessRole[];

  @ApiPropertyOptional({
    description: 'Whether the policy is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
