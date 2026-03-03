// apps/triply.api/src/modules/audit/audit.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditAction, AuditQueryDto, Permission } from '@org.triply/database';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  AuditService,
} from '@org.triply/shared';
import { AuditAnalyticsQueryDto } from './dto/audit-analytics-query.dto';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@RequirePermissions(Permission.AUDIT_READ)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  async getLogs(@Query() query: AuditQueryDto): Promise<{
    logs: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    return this.auditService.findLogs(
      {
        actorId: query.actorId,
        resource: query.resource,
        action: query.action as AuditAction | undefined,
        businessId: query.businessId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      page,
      limit,
    );
  }

  @Get('logs/user/:userId')
  @ApiOperation({ summary: 'Get audit logs for a user' })
  async getUserLogs(
    @Param('userId') userId: string,
    @Query() query: AuditQueryDto,
  ): Promise<{ logs: unknown[]; total: number; page: number; limit: number }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    return this.auditService.findLogs({ actorId: userId }, page, limit);
  }

  @Get('logs/business/:businessId')
  @ApiOperation({ summary: 'Get audit logs for a business' })
  async getBusinessLogs(
    @Param('businessId') businessId: string,
    @Query() query: AuditQueryDto,
  ): Promise<{ logs: unknown[]; total: number; page: number; limit: number }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    return this.auditService.findLogs({ businessId }, page, limit);
  }

  @Get('logs/resource/:resource/:id')
  @ApiOperation({ summary: 'Get audit logs by resource and resource ID' })
  async getResourceLogs(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Query() query: AuditQueryDto,
  ): Promise<{ logs: unknown[]; total: number; page: number; limit: number }> {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    return this.auditService.findLogs(
      {
        resource,
        resourceId: id,
      },
      page,
      limit,
    );
  }

  @Get('analytics/failed-logins')
  @ApiOperation({ summary: 'Aggregate failed login attempts by day' })
  @ApiResponse({ status: 200, description: 'Failed login trend returned' })
  async getFailedLoginAnalytics(
    @Query() query: AuditAnalyticsQueryDto,
  ): Promise<{ days: number; points: Array<{ date: string; count: number }> }> {
    const days = Math.max(Number(query.days || 30), 1);
    const points = await this.auditService.getFailedLoginsByDay(days);

    return { days, points };
  }

  @Get('analytics/suspicious-actions')
  @ApiOperation({ summary: 'Aggregate suspicious actions' })
  @ApiResponse({
    status: 200,
    description: 'Suspicious action summary returned',
  })
  async getSuspiciousActionsAnalytics(
    @Query() query: AuditAnalyticsQueryDto,
  ): Promise<{
    days: number;
    limit: number;
    points: Array<{ action: string; count: number; lastSeenAt: Date }>;
  }> {
    const days = Math.max(Number(query.days || 30), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const points = await this.auditService.getSuspiciousActions(days, limit);

    return { days, limit, points };
  }

  @Get('analytics/top-permission-denials')
  @ApiOperation({ summary: 'Aggregate top permission denial events' })
  @ApiResponse({
    status: 200,
    description: 'Top permission denial summary returned',
  })
  async getTopPermissionDenials(
    @Query() query: AuditAnalyticsQueryDto,
  ): Promise<{
    days: number;
    limit: number;
    points: Array<{ permission: string; count: number }>;
  }> {
    const days = Math.max(Number(query.days || 30), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const points = await this.auditService.getTopPermissionDenials(days, limit);

    return { days, limit, points };
  }
}
