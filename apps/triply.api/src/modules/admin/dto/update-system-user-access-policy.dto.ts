// apps/triply.api/src/modules/admin/dto/update-system-user-access-policy.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIP, IsOptional } from 'class-validator';

export class UpdateSystemUserAccessPolicyDto {
  @ApiPropertyOptional({
    description: 'Allowlist of IP addresses. Empty list means allow all.',
    type: [String],
    example: ['203.0.113.10', '198.51.100.8'],
  })
  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({
    description: 'Denylist of IP addresses. Takes precedence over allowlist.',
    type: [String],
    example: ['203.0.113.11'],
  })
  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true })
  deniedIps?: string[];

  @ApiPropertyOptional({
    description: 'Require step-up verification on unknown IP addresses',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  requireStepUpOnUnknownIp?: boolean;

  @ApiPropertyOptional({
    description: 'Require step-up verification on unknown devices',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  requireStepUpOnUnknownDevice?: boolean;

  @ApiPropertyOptional({
    description: 'Send security alert emails when a risk event is detected',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnRiskEvent?: boolean;
}
