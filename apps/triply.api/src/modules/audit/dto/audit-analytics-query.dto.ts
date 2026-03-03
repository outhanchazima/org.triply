// apps/triply.api/src/modules/audit/dto/audit-analytics-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class AuditAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Lookback window in days',
    example: '30',
  })
  @IsOptional()
  @IsNumberString()
  days?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of records to return',
    example: '20',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
