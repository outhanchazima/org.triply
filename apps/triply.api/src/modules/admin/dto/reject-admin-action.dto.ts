// apps/triply.api/src/modules/admin/dto/reject-admin-action.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectAdminActionDto {
  @ApiProperty({
    description: 'Reason for rejecting the high-risk request',
    example: 'Insufficient supporting evidence for suspension.',
  })
  @IsString()
  @Length(5, 500)
  reason!: string;
}
