// apps/triply.api/src/modules/business/dto/reject-business-action.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectBusinessActionDto {
  @ApiProperty({
    description: 'Reason for rejecting the action request',
    example: 'Missing reference documents for export request.',
  })
  @IsString()
  @Length(5, 500)
  reason!: string;
}
