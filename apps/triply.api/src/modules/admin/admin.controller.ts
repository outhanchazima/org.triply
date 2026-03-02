// apps/triply.api/src/modules/admin/admin.controller.ts
import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateSystemUserDto,
  KycReviewDto,
  Permission,
  SystemRole,
} from '@org.triply/database';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  SystemUserGuard,
} from '@org.triply/shared';
import type { Request } from 'express';
import type { JwtPayload } from '@org.triply/shared';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(JwtAuthGuard, SystemUserGuard, PermissionsGuard)
  @Patch('businesses/:id/kyc/review')
  @ApiBearerAuth()
  @RequirePermissions(Permission.KYC_REVIEW)
  @ApiOperation({ summary: 'Review business KYC (approve/reject)' })
  @ApiResponse({ status: 200, description: 'KYC review completed' })
  async reviewKyc(
    @CurrentUser() user: JwtPayload,
    @Param('id') businessId: string,
    @Body() dto: KycReviewDto,
    @Req() request: Request,
  ): Promise<{ status: string; message: string }> {
    return this.adminService.reviewKyc(user, businessId, dto, request);
  }

  @UseGuards(JwtAuthGuard, SystemUserGuard, PermissionsGuard)
  @Post('system-users')
  @ApiBearerAuth()
  @RequirePermissions(Permission.SYSTEM_USER_PROVISION)
  @ApiOperation({ summary: 'Provision a system user' })
  async createSystemUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSystemUserDto,
    @Req() request: Request,
  ): Promise<{ id: string; email: string; role: SystemRole }> {
    return this.adminService.createSystemUser(user, dto, request);
  }
}
