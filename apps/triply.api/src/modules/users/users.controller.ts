// apps/triply.api/src/modules/users/users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Permission } from '@org.triply/database';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  SelfOrAdminGuard,
} from '@org.triply/shared';
import type { Request } from 'express';
import type { JwtPayload } from '@org.triply/shared';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import {
  UserMembershipResponse,
  UserProfileResponse,
  UsersService,
} from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and memberships' })
  @ApiResponse({ status: 200, description: 'Current profile returned' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<{
    user: UserProfileResponse;
    memberships: UserMembershipResponse[];
  }> {
    return this.usersService.getMe(user.sub);
  }

  @UseGuards(PermissionsGuard)
  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List users (admin/system scope)' })
  @ApiResponse({ status: 200, description: 'Users returned' })
  async listUsers(@Query() query: UsersQueryDto): Promise<{
    users: UserProfileResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.usersService.listUsers(query);
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':userId/memberships')
  @ApiOperation({ summary: 'Get memberships for a user (self or admin)' })
  @ApiResponse({ status: 200, description: 'Memberships returned' })
  async getUserMemberships(
    @Param('userId') userId: string,
  ): Promise<UserMembershipResponse[]> {
    return this.usersService.getUserMemberships(userId);
  }

  @UseGuards(SelfOrAdminGuard)
  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile (self or admin)' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getUser(@Param('userId') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getUser(userId);
  }

  @UseGuards(SelfOrAdminGuard)
  @Patch(':userId')
  @ApiOperation({ summary: 'Update user profile (self or admin)' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  async updateUser(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserProfileDto,
    @Req() request: Request,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateUser(actor, userId, dto, request);
  }

  @UseGuards(PermissionsGuard)
  @Patch(':userId/deactivate')
  @RequirePermissions(Permission.USER_DELETE)
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiResponse({ status: 200, description: 'User account deactivated' })
  async deactivateUser(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<{ id: string; isActive: boolean; message: string }> {
    return this.usersService.deactivateUser(actor, userId, request);
  }
}
