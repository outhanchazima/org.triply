// apps/triply.api/src/modules/business/business.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
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
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  BusinessContextSummary,
  BusinessDetailsResponse,
  BusinessMemberResponse,
  BusinessService,
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
