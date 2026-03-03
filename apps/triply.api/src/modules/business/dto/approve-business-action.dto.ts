// apps/triply.api/src/modules/business/dto/approve-business-action.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ApproveBusinessActionDto {
  @ApiPropertyOptional({
    description: 'Optional approval note',
    example: 'Approved after reviewing reconciliation references.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 500)
  note?: string;
}
