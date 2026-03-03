// apps/triply.api/src/modules/business/dto/execute-high-risk-action.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ExecuteHighRiskActionDto {
  @ApiPropertyOptional({
    description: 'Optional approval request ID if executing after approval',
    example: '65f4ab129901f6ab3c7a8d11',
  })
  @IsOptional()
  @IsMongoId()
  approvalId?: string;

  @ApiPropertyOptional({
    description: 'Optional reason/note for creating approval request',
    example: 'Finance export for monthly reconciliation',
  })
  @IsOptional()
  @IsString()
  @Length(2, 500)
  requestNote?: string;

  @ApiPropertyOptional({
    description:
      'Action payload that will be validated and replayed after approval',
    example: { format: 'csv', range: '2026-03' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
