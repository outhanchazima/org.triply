// apps/triply.api/src/modules/users/users.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, SelfOrAdminGuard } from '@org.triply/shared';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Get(':userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile (self or admin)' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getUser(@Param('userId') userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    isTraveller: boolean;
    isSystemUser: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
  }> {
    return this.usersService.getUser(userId);
  }
}
