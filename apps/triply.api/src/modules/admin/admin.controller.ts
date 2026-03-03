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
  AdminApprovalResponse,
  PendingApprovalResponse,
  PendingKycBusinessResponse,
  SystemApprovalPolicyResponse,
  SystemUserAccessPolicyResponse,
  SystemUserResponse,
} from './admin.service';
import { AdminApprovalsQueryDto } from './dto/admin-approvals-query.dto';
import { ApproveAdminActionDto } from './dto/approve-admin-action.dto';
import { HighRiskApprovalQueryDto } from './dto/high-risk-approval-query.dto';
import { RejectAdminActionDto } from './dto/reject-admin-action.dto';
import { SystemUsersQueryDto } from './dto/system-users-query.dto';
import { UpdateSystemUserDto } from './dto/update-system-user.dto';
import { UpdateSystemUserAccessPolicyDto } from './dto/update-system-user-access-policy.dto';
import { UpsertSystemApprovalPolicyDto } from './dto/upsert-system-approval-policy.dto';

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
    @Query() query: HighRiskApprovalQueryDto,
    @Req() request: Request,
  ): Promise<
    | {
        id: string;
        status: string;
        message: string;
        requiresApproval: false;
      }
    | ({ id: string } & PendingApprovalResponse)
  > {
    return this.adminService.suspendBusiness(
      user,
      businessId,
      query.approvalId,
      request,
    );
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
    @Query() query: HighRiskApprovalQueryDto,
    @Req() request: Request,
  ): Promise<
    | {
        id: string;
        email: string;
        role: SystemRole;
        requiresApproval: false;
      }
    | ({
        id: null;
        email: string;
        role: SystemRole;
      } & PendingApprovalResponse)
  > {
    return this.adminService.createSystemUser(
      user,
      dto,
      query.approvalId,
      request,
    );
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

  @Get('approvals')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'List high-risk dual-control approval requests' })
  @ApiResponse({ status: 200, description: 'Approval requests returned' })
  async listApprovals(
    @CurrentUser() actor: JwtPayload,
    @Query() query: AdminApprovalsQueryDto,
  ): Promise<{
    approvals: AdminApprovalResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.adminService.listApprovalRequests(actor, {
      status: query.status,
      actionType: query.actionType,
      actionKey: query.actionKey,
      scope: query.scope,
      businessId: query.businessId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Get('approval-policies')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'List system approval workflow policies' })
  @ApiResponse({
    status: 200,
    description: 'System approval policies returned',
  })
  async listSystemApprovalPolicies(
    @CurrentUser() actor: JwtPayload,
  ): Promise<SystemApprovalPolicyResponse[]> {
    return this.adminService.listSystemApprovalPolicies(actor);
  }

  @Patch('approval-policies/:actionKey')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Upsert a system approval workflow policy by action key',
  })
  @ApiResponse({ status: 200, description: 'System approval policy upserted' })
  async upsertSystemApprovalPolicy(
    @CurrentUser() actor: JwtPayload,
    @Param('actionKey') actionKey: string,
    @Body() dto: UpsertSystemApprovalPolicyDto,
    @Req() request: Request,
  ): Promise<SystemApprovalPolicyResponse> {
    return this.adminService.upsertSystemApprovalPolicy(
      actor,
      actionKey,
      dto,
      request,
    );
  }

  @Post('approvals/:approvalId/approve')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Approve a high-risk action request' })
  @ApiResponse({ status: 200, description: 'Approval request approved' })
  async approveAction(
    @CurrentUser() actor: JwtPayload,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveAdminActionDto,
    @Req() request: Request,
  ): Promise<AdminApprovalResponse> {
    return this.adminService.approveHighRiskAction(
      actor,
      approvalId,
      dto.note,
      request,
    );
  }

  @Post('approvals/:approvalId/reject')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Reject a high-risk action request' })
  @ApiResponse({ status: 200, description: 'Approval request rejected' })
  async rejectAction(
    @CurrentUser() actor: JwtPayload,
    @Param('approvalId') approvalId: string,
    @Body() dto: RejectAdminActionDto,
    @Req() request: Request,
  ): Promise<AdminApprovalResponse> {
    return this.adminService.rejectHighRiskAction(
      actor,
      approvalId,
      dto.reason,
      request,
    );
  }

  @Get('system-users/:userId/access-policy')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Get IP risk policy for a system user' })
  @ApiResponse({ status: 200, description: 'Access policy returned' })
  async getSystemUserAccessPolicy(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<SystemUserAccessPolicyResponse> {
    return this.adminService.getSystemUserAccessPolicy(actor, userId);
  }

  @Patch('system-users/:userId/access-policy')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Update IP risk policy for a system user' })
  @ApiResponse({ status: 200, description: 'Access policy updated' })
  async updateSystemUserAccessPolicy(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateSystemUserAccessPolicyDto,
    @Req() request: Request,
  ): Promise<SystemUserAccessPolicyResponse> {
    return this.adminService.updateSystemUserAccessPolicy(
      actor,
      userId,
      dto,
      request,
    );
  }
}
