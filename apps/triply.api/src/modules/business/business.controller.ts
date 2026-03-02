// apps/triply.api/src/modules/business/business.controller.ts
import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InviteMemberDto, Permission } from '@org.triply/database';
import {
  BusinessContextGuard,
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from '@org.triply/shared';
import type { Request } from 'express';
import type { JwtPayload } from '@org.triply/shared';
import { BusinessService } from './business.service';

@ApiTags('Business')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @UseGuards(JwtAuthGuard, BusinessContextGuard, PermissionsGuard)
  @Post(':businessId/members/invite')
  @ApiBearerAuth()
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
}
