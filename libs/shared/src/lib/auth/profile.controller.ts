// libs/shared/src/lib/auth/profile.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ActivateTravellerDto } from '@org.triply/database';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './services/auth.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('traveller/activate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate traveller profile for current user' })
  @ApiResponse({
    status: 200,
    description: 'Traveller profile activated and new access token issued',
  })
  @ApiResponse({ status: 400, description: 'Traveller profile already exists' })
  async activateTraveller(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActivateTravellerDto,
    @Req() request: Request,
  ): Promise<{ accessToken: string; message: string }> {
    return this.authService.activateTravellerProfile(user.sub, dto, request);
  }
}
