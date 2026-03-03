// apps/triply.api/src/modules/business/business.controller.ts
import {
  Body,
  Controller,
  Delete,
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
  InviteMemberDto,
  Permission,
  UpdateMemberPermissionsDto,
  UpdateMemberRoleDto,
} from '@org.triply/database';
import {
  BusinessContextGuard,
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from '@org.triply/shared';
import type { Request } from 'express';
import type { JwtPayload } from '@org.triply/shared';
import { ApproveBusinessActionDto } from './dto/approve-business-action.dto';
import { CreateRoleTemplateDto } from './dto/create-role-template.dto';
import { ExecuteHighRiskActionDto } from './dto/execute-high-risk-action.dto';
import { ListBusinessApprovalsQueryDto } from './dto/list-business-approvals-query.dto';
import { RejectBusinessActionDto } from './dto/reject-business-action.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpsertBusinessApprovalPolicyDto } from './dto/upsert-business-approval-policy.dto';
import { UpdateRoleTemplateDto } from './dto/update-role-template.dto';
import {
  BusinessApprovalPolicyResponse,
  BusinessApprovalResponse,
  BusinessContextSummary,
  BusinessDetailsResponse,
  InviteHistoryResponse,
  BusinessMemberResponse,
  BusinessService,
  OwnershipTransferStatusResponse,
  RoleTemplateResponse,
} from './business.service';

@ApiTags('Business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('my')
  @ApiOperation({ summary: 'List businesses for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Businesses returned' })
  async listMyBusinesses(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ businesses: BusinessContextSummary[] }> {
    return this.businessService.listMyBusinesses(user);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId')
  @RequirePermissions(Permission.BUSINESS_READ)
  @ApiOperation({ summary: 'Get business details in active context' })
  @ApiResponse({ status: 200, description: 'Business details returned' })
  async getBusiness(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
  ): Promise<BusinessDetailsResponse> {
    return this.businessService.getBusiness(user, businessId);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId')
  @RequirePermissions(Permission.BUSINESS_UPDATE)
  @ApiOperation({ summary: 'Update business details' })
  @ApiResponse({ status: 200, description: 'Business updated' })
  async updateBusiness(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessDto,
    @Req() request: Request,
  ): Promise<BusinessDetailsResponse> {
    return this.businessService.updateBusiness(user, businessId, dto, request);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/members')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List business members' })
  @ApiResponse({ status: 200, description: 'Members returned' })
  async listMembers(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
  ): Promise<{ businessId: string; members: BusinessMemberResponse[] }> {
    return this.businessService.listMembers(user, businessId);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/approval-policies')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List business approval workflow policies' })
  @ApiResponse({
    status: 200,
    description: 'Business approval policies returned',
  })
  async listApprovalPolicies(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
  ): Promise<{
    businessId: string;
    policies: BusinessApprovalPolicyResponse[];
  }> {
    return this.businessService.listApprovalPolicies(user, businessId);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/approval-policies/:actionKey')
  @RequirePermissions(Permission.BUSINESS_UPDATE)
  @ApiOperation({
    summary: 'Upsert business approval policy for an action key',
  })
  @ApiResponse({
    status: 200,
    description: 'Business approval policy upserted',
  })
  async upsertApprovalPolicy(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('actionKey') actionKey: string,
    @Body() dto: UpsertBusinessApprovalPolicyDto,
    @Req() request: Request,
  ): Promise<BusinessApprovalPolicyResponse> {
    return this.businessService.upsertApprovalPolicy(
      user,
      businessId,
      actionKey,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/approvals')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List business approval requests' })
  @ApiResponse({
    status: 200,
    description: 'Business approval requests returned',
  })
  async listApprovals(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Query() query: ListBusinessApprovalsQueryDto,
  ): Promise<{
    approvals: BusinessApprovalResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.businessService.listApprovalRequests(user, businessId, {
      status: query.status,
      actionKey: query.actionKey,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/approvals/:approvalId/approve')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Approve business high-risk action request' })
  @ApiResponse({
    status: 200,
    description: 'Business approval request approved',
  })
  async approveAction(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveBusinessActionDto,
    @Req() request: Request,
  ): Promise<BusinessApprovalResponse> {
    return this.businessService.approveApprovalRequest(
      user,
      businessId,
      approvalId,
      dto.note,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/approvals/:approvalId/reject')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Reject business high-risk action request' })
  @ApiResponse({
    status: 200,
    description: 'Business approval request rejected',
  })
  async rejectAction(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: RejectBusinessActionDto,
    @Req() request: Request,
  ): Promise<BusinessApprovalResponse> {
    return this.businessService.rejectApprovalRequest(
      user,
      businessId,
      approvalId,
      dto.reason,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/high-risk-actions/:actionKey/execute')
  @RequirePermissions(Permission.BUSINESS_READ)
  @ApiOperation({
    summary:
      'Execute high-risk action with auto-approval or second-approval workflow',
  })
  @ApiResponse({ status: 200, description: 'High-risk action processed' })
  async executeHighRiskAction(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('actionKey') actionKey: string,
    @Body() dto: ExecuteHighRiskActionDto,
    @Req() request: Request,
  ): Promise<
    | {
        executed: true;
        businessId: string;
        actionKey: string;
        autoApproved: boolean;
        approvalId: string | null;
      }
    | {
        executed: false;
        requiresApproval: true;
        businessId: string;
        actionKey: string;
        approvalId: string;
        expiresAt: Date;
      }
  > {
    return this.businessService.executeHighRiskAction(
      user,
      businessId,
      actionKey,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/role-templates')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List reusable role templates for a business' })
  @ApiResponse({ status: 200, description: 'Role templates returned' })
  async listRoleTemplates(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<{ businessId: string; templates: RoleTemplateResponse[] }> {
    return this.businessService.listRoleTemplates(
      user,
      businessId,
      includeInactive === 'true',
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/role-templates')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Create a reusable role template for members' })
  @ApiResponse({ status: 201, description: 'Role template created' })
  async createRoleTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: CreateRoleTemplateDto,
    @Req() request: Request,
  ): Promise<RoleTemplateResponse> {
    return this.businessService.createRoleTemplate(
      user,
      businessId,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/role-templates/:templateId')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update an existing role template' })
  @ApiResponse({ status: 200, description: 'Role template updated' })
  async updateRoleTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateRoleTemplateDto,
    @Req() request: Request,
  ): Promise<RoleTemplateResponse> {
    return this.businessService.updateRoleTemplate(
      user,
      businessId,
      templateId,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Delete(':businessId/role-templates/:templateId')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Delete a role template' })
  @ApiResponse({ status: 200, description: 'Role template deleted' })
  async deleteRoleTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    return this.businessService.deleteRoleTemplate(
      user,
      businessId,
      templateId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/members/:userId/role-templates/:templateId/apply')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Apply a role template to a member' })
  @ApiResponse({ status: 200, description: 'Role template applied to member' })
  async applyRoleTemplateToMember(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Param('templateId') templateId: string,
    @Req() request: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    templateId: string;
    role: string;
    extraPermissions: string[];
    deniedPermissions: string[];
  }> {
    return this.businessService.applyRoleTemplateToMember(
      user,
      businessId,
      userId,
      templateId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/members/invite')
  @RequirePermissions(Permission.MEMBER_INVITE)
  @ApiOperation({ summary: 'Invite a staff member to a business' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteMember(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: InviteMemberDto,
    @Req() request: Request,
  ): Promise<{ message: string; businessId: string; memberEmail: string }> {
    return this.businessService.inviteMember(user, businessId, dto, request);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/members/:userId/invite/resend')
  @RequirePermissions(Permission.MEMBER_INVITE)
  @ApiOperation({ summary: 'Resend pending member invitation' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  async resendInvite(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{ message: string; businessId: string; userId: string }> {
    return this.businessService.resendInvite(user, businessId, userId, request);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/invite/cancel')
  @RequirePermissions(Permission.MEMBER_INVITE)
  @ApiOperation({ summary: 'Cancel a pending member invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled' })
  async cancelInvite(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    return this.businessService.cancelInvite(user, businessId, userId, request);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/invite/expire')
  @RequirePermissions(Permission.MEMBER_INVITE)
  @ApiOperation({ summary: 'Expire a pending member invitation' })
  @ApiResponse({ status: 200, description: 'Invitation expired' })
  async expireInvite(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    return this.businessService.expireInvite(user, businessId, userId, request);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/members/:userId/invite/history')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get invite status history for a member' })
  @ApiResponse({ status: 200, description: 'Invite history returned' })
  async getInviteHistory(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
  ): Promise<InviteHistoryResponse> {
    return this.businessService.getInviteHistory(user, businessId, userId);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Get(':businessId/transfer-ownership')
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get ownership transfer status' })
  @ApiResponse({
    status: 200,
    description: 'Ownership transfer status returned',
  })
  async getOwnershipTransferStatus(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
  ): Promise<OwnershipTransferStatusResponse> {
    return this.businessService.getOwnershipTransferStatus(user, businessId);
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/transfer-ownership')
  @RequirePermissions(Permission.BUSINESS_UPDATE)
  @ApiOperation({ summary: 'Initiate ownership transfer' })
  @ApiResponse({ status: 201, description: 'Ownership transfer initiated' })
  async initiateOwnershipTransfer(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Body() dto: TransferOwnershipDto,
    @Req() request: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    return this.businessService.initiateOwnershipTransfer(
      user,
      businessId,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard)
  @Post(':businessId/transfer-ownership/accept')
  @ApiOperation({ summary: 'Accept ownership transfer as proposed owner' })
  @ApiResponse({ status: 200, description: 'Ownership transfer accepted' })
  async acceptOwnershipTransfer(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Req() request: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    return this.businessService.acceptOwnershipTransfer(
      user,
      businessId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/transfer-ownership/confirm')
  @RequirePermissions(Permission.BUSINESS_UPDATE)
  @ApiOperation({ summary: 'Confirm ownership transfer and finalize roles' })
  @ApiResponse({ status: 200, description: 'Ownership transfer confirmed' })
  async confirmOwnershipTransfer(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Req() request: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    return this.businessService.confirmOwnershipTransfer(
      user,
      businessId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/role')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update member role for the business' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  async updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() request: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    role: string;
    status: string;
  }> {
    return this.businessService.updateMemberRole(
      user,
      businessId,
      userId,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/permissions')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update member permission overrides' })
  @ApiResponse({ status: 200, description: 'Member permissions updated' })
  async updateMemberPermissions(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberPermissionsDto,
    @Req() request: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    extraPermissions: string[];
    deniedPermissions: string[];
  }> {
    return this.businessService.updateMemberPermissions(
      user,
      businessId,
      userId,
      dto,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/suspend')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Suspend a business member' })
  @ApiResponse({ status: 200, description: 'Member suspended' })
  async suspendMember(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    return this.businessService.suspendMember(
      user,
      businessId,
      userId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Patch(':businessId/members/:userId/activate')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Activate a business member' })
  @ApiResponse({ status: 200, description: 'Member activated' })
  async activateMember(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    return this.businessService.activateMember(
      user,
      businessId,
      userId,
      request,
    );
  }

  @UseGuards(BusinessContextGuard, PermissionsGuard)
  @Delete(':businessId/members/:userId')
  @RequirePermissions(Permission.MEMBER_REMOVE)
  @ApiOperation({ summary: 'Remove member from business' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    return this.businessService.removeMember(user, businessId, userId, request);
  }
}
