// apps/triply.api/src/modules/admin/admin.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import {
  AdminService,
  PendingKycBusinessResponse,
  SystemUserResponse,
} from './admin.service';
import { SystemUsersQueryDto } from './dto/system-users-query.dto';
import { UpdateSystemUserDto } from './dto/update-system-user.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, SystemUserGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('businesses/:id/kyc/review')
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

  @Get('businesses/kyc/pending')
  @RequirePermissions(Permission.KYC_READ)
  @ApiOperation({ summary: 'List businesses pending KYC review' })
  @ApiResponse({ status: 200, description: 'Pending KYC businesses returned' })
  async getPendingKycBusinesses(): Promise<PendingKycBusinessResponse[]> {
    return this.adminService.listPendingKycBusinesses();
  }

  @Patch('businesses/:id/suspend')
  @RequirePermissions(Permission.BUSINESS_SUSPEND)
  @ApiOperation({ summary: 'Suspend a business' })
  @ApiResponse({ status: 200, description: 'Business suspended' })
  async suspendBusiness(
    @CurrentUser() user: JwtPayload,
    @Param('id') businessId: string,
    @Req() request: Request,
  ): Promise<{ id: string; status: string; message: string }> {
    return this.adminService.suspendBusiness(user, businessId, request);
  }

  @Patch('businesses/:id/reactivate')
  @RequirePermissions(Permission.BUSINESS_SUSPEND)
  @ApiOperation({ summary: 'Reactivate a business' })
  @ApiResponse({ status: 200, description: 'Business reactivated' })
  async reactivateBusiness(
    @CurrentUser() user: JwtPayload,
    @Param('id') businessId: string,
    @Req() request: Request,
  ): Promise<{ id: string; status: string; message: string }> {
    return this.adminService.reactivateBusiness(user, businessId, request);
  }

  @Post('system-users')
  @RequirePermissions(Permission.SYSTEM_USER_PROVISION)
  @ApiOperation({ summary: 'Provision a system user' })
  @ApiResponse({ status: 201, description: 'System user provisioned' })
  async createSystemUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSystemUserDto,
    @Req() request: Request,
  ): Promise<{ id: string; email: string; role: SystemRole }> {
    return this.adminService.createSystemUser(user, dto, request);
  }

  @Get('system-users')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'List system users' })
  @ApiResponse({ status: 200, description: 'System users returned' })
  async listSystemUsers(
    @Query() query: SystemUsersQueryDto,
  ): Promise<SystemUserResponse[]> {
    return this.adminService.listSystemUsers(query.role);
  }

  @Get('system-users/:userId')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Get a system user by user ID' })
  @ApiResponse({ status: 200, description: 'System user returned' })
  async getSystemUser(
    @Param('userId') userId: string,
  ): Promise<SystemUserResponse> {
    return this.adminService.getSystemUser(userId);
  }

  @Patch('system-users/:userId')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Update system user role/department/state' })
  @ApiResponse({ status: 200, description: 'System user updated' })
  async updateSystemUser(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateSystemUserDto,
    @Req() request: Request,
  ): Promise<SystemUserResponse> {
    return this.adminService.updateSystemUser(actor, userId, dto, request);
  }
}
