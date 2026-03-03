// apps/triply.api/src/modules/users/dto/update-user-profile.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'User display name',
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://cdn.example.com/avatar.png',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+254712345678',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/)
  phone?: string;
}
