// apps/api/src/app/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpException,
  UseGuards,
  Req,
  Ip,
  Headers,
  Res,
  Param,
  Query,
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
  SessionsQueryDto,
  SessionInfoDto,
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
   * Send step-up OTP for suspicious login verification.
   */
  @Public()
  @Post('step-up/send')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @ApiOperation({ summary: 'Send step-up OTP for risk-based verification' })
  @ApiResponse({ status: 200, description: 'Step-up OTP sent successfully' })
  async sendStepUpOtp(
    @Body() dto: SendOtpDto,
    @Req() request: Request,
  ): Promise<{ message: string; expiresIn: number }> {
    return this.authService.sendOtp(
      dto.email,
      OtpPurpose.VERIFY_EMAIL,
      request,
    );
  }

  /**
   * Verify step-up OTP after unusual Google login.
   */
  @Public()
  @Post('step-up/verify')
  @ApiOperation({ summary: 'Verify step-up OTP and complete login' })
  @ApiResponse({
    status: 200,
    description: 'Step-up verified, tokens issued',
    type: AuthResponseDto,
  })
  async verifyStepUpOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyStepUpOtp(
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

    try {
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
    } catch (error) {
      const appUrl = this.configService.get<string>(
        'APP_URL',
        'http://localhost:4200',
      );
      const redirectUrl = new URL('/auth/callback', appUrl);

      if (error instanceof HttpException && error.getStatus() === 428) {
        const payload = error.getResponse();
        const details =
          payload && typeof payload === 'object'
            ? (payload as Record<string, unknown>)
            : {};

        redirectUrl.searchParams.set('stepUpRequired', 'true');
        if (typeof details.email === 'string') {
          redirectUrl.searchParams.set('email', details.email);
        }
        response.redirect(redirectUrl.toString());
        return;
      }

      redirectUrl.searchParams.set('error', 'google_auth_failed');
      response.redirect(redirectUrl.toString());
    }
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
   * List active sessions/devices.
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions/devices' })
  @ApiResponse({ status: 200, description: 'Active sessions returned' })
  async getSessions(
    @CurrentUser() user: JwtPayload,
    @Query() query: SessionsQueryDto,
  ): Promise<{ userId: string; sessions: SessionInfoDto[] }> {
    return this.authService.listSessions(user, query.userId);
  }

  /**
   * Revoke one session/device by session ID.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one active session/device' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
    @Query() query: SessionsQueryDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    return this.authService.revokeSession(
      user,
      sessionId,
      query.userId,
      request,
    );
  }

  /**
   * Revoke all active sessions/devices.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all active sessions/devices' })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
  })
  async revokeAllSessions(
    @CurrentUser() user: JwtPayload,
    @Query() query: SessionsQueryDto,
    @Req() request: Request,
  ): Promise<{ message: string; revokedCount: number }> {
    return this.authService.revokeAllSessions(user, query.userId, request);
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
