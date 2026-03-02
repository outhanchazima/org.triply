// apps/api/src/app/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import {
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  SwitchContextDto,
  AcceptInviteDto,
  AuthResponseDto,
  SafeUserDto,
  AuthContextDto,
  OtpPurpose,
} from '@org.triply/database';
import { AuthService } from './services/auth.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send OTP to email (login/register)
   */
  @Public()
  @Post('otp/send')
  @Throttle({ default: { limit: 3, ttl: 600000 } }) // 3 per 10 minutes
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendOtp(
    @Body() dto: SendOtpDto,
    @Req() request: Request,
  ): Promise<{ message: string; expiresIn: number }> {
    return this.authService.sendOtp(dto.email, OtpPurpose.LOGIN, request);
  }

  /**
   * Verify OTP and issue tokens
   */
  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(
      dto.email,
      dto.otp,
      dto.deviceInfo,
      ip,
      request,
    );
  }

  /**
   * Google OAuth redirect
   */
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  async googleAuth(): Promise<void> {
    // Handled by Passport GoogleStrategy guard
  }

  /**
   * Google OAuth callback
   */
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect with tokens' })
  async googleAuthCallback(
    @Req()
    request: Request & {
      user?: {
        googleId: string;
        email: string;
        displayName: string;
        avatarUrl: string | null;
      };
    },
    @Res() response: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<void> {
    if (!request.user) {
      response.redirect('/auth/error?message=google_auth_failed');
      return;
    }

    const auth = await this.authService.handleGoogleAuth(
      request.user,
      userAgent,
      ip,
      request,
    );

    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:4200',
    );
    const redirectUrl = new URL('/auth/callback', appUrl);
    redirectUrl.searchParams.set('token', auth.accessToken);
    redirectUrl.searchParams.set('refresh', auth.refreshToken);

    response.redirect(redirectUrl.toString());
  }

  /**
   * Accept business invitation
   */
  @Public()
  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted and tokens issued',
    type: AuthResponseDto,
  })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Ip() ip: string,
    @Headers('user-agent') deviceInfo: string,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.acceptInvite(
      dto.email,
      dto.otp,
      dto.businessId,
      deviceInfo,
      ip,
      request,
    );
  }

  /**
   * Refresh access token
   */
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') deviceInfo: string,
    @Req() request: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshTokens(
      dto.refreshToken,
      deviceInfo,
      ip,
      request,
    );
  }

  /**
   * Logout
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Body() dto?: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.sub, dto?.refreshToken, request);
  }

  /**
   * Get current user profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<{
    user: SafeUserDto;
    travellerProfile: unknown | null;
    systemProfile: unknown | null;
    memberships: unknown[];
  }> {
    return this.authService.getMe(user.sub);
  }

  /**
   * Get current permissions
   */
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current permissions and feature flags' })
  @ApiResponse({ status: 200, description: 'Permissions and feature flags' })
  async getPermissions(@CurrentUser() user: JwtPayload): Promise<{
    permissions: string[];
    featureFlags: AuthContextDto['featureFlags'];
  }> {
    return {
      permissions: user.permissions,
      featureFlags: user.featureFlags,
    };
  }

  /**
   * Switch business context
   */
  @UseGuards(JwtAuthGuard)
  @Post('switch-context')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active business context' })
  @ApiResponse({
    status: 200,
    description: 'Context switched, new access token issued',
  })
  async switchContext(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SwitchContextDto,
    @Req() request: Request,
  ): Promise<{ accessToken: string; context: AuthContextDto }> {
    return this.authService.switchContext(
      user.sub,
      dto.businessId,
      user.activeBusinessId,
      request,
    );
  }
}
