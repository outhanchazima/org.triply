// apps/triply.api/src/modules/admin/dto/high-risk-approval-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class HighRiskApprovalQueryDto {
  @ApiPropertyOptional({
    description:
      'Approved dual-control request ID required to execute high-risk action',
    example: '65f4ab129901f6ab3c7a8d11',
  })
  @IsOptional()
  @IsMongoId()
  approvalId?: string;
}
