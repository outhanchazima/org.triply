// apps/triply.api/src/modules/business/dto/transfer-ownership.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    description: 'User ID of the target owner who will receive ownership',
    example: '60f7c0b5e1d2c4567890abcf',
  })
  @IsMongoId()
  newOwnerUserId!: string;

  @ApiPropertyOptional({
    description: 'Optional transfer note for auditing and context',
    example: 'Transitioning account control to managing director.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 300)
  note?: string;
}
