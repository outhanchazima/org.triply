// libs/shared/src/lib/services/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { generate, verify } from 'otplib';
import { Request } from 'express';
import { Types } from 'mongoose';

import {
  UserRepository,
  BusinessRepository,
  BusinessMembershipRepository,
  RefreshTokenRepository,
  TravellerProfileRepository,
  SystemUserProfileRepository,
  UserDocument,
  BusinessMembershipDocument,
  BusinessRole,
  TRAVELLER_PERMISSIONS,
  ROLE_PERMISSIONS,
  AuditAction,
  OtpPurpose,
  AuthResponseDto,
  SafeUserDto,
  MembershipInfoDto,
  AuthContextDto,
} from '@org.triply/database';

import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { AuditService } from '../../audit/services';
import { MailService } from '../../mail/services';

export enum OtpStrategy {
  TOTP = 'totp',
  HOTP = 'hotp',
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtExpiresInSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly travellerProfileRepository: TravellerProfileRepository,
    private readonly systemUserProfileRepository: SystemUserProfileRepository,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.jwtExpiresInSeconds = this.parseDuration(this.jwtExpiresIn);
  }

  /**
   * Send OTP to email
   */
  async sendOtp(
    email: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
    request?: Request,
  ): Promise<{ message: string; expiresIn: number }> {
    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = request?.ip || '';

    // Find or create user
    let user = await this.userRepository.findByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      // Create new user shell
      user = await this.userRepository.create({
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        isEmailVerified: false,
        authProviders: [],
      });
      isNewUser = true;
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed attempts. Please try again later.',
      );
    }

    // Generate 6-digit OTP
    const secret = `${this.configService.getOrThrow<string>('OTP_SECRET')}:${normalizedEmail}:${purpose}`;
    const otp = await generate({
      secret,
      strategy: OtpStrategy.TOTP,
      digits: 6,
      period: this.configService.get<number>('OTP_PERIOD', 300),
    });
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP hash
    await this.userRepository.setOtp(
      normalizedEmail,
      otpHash,
      expiresAt,
      purpose,
    );

    // Audit log
    await this.auditService.log(
      {
        action: AuditAction.OTP_SENT,
        resource: 'User',
        resourceId: user.id,
        metadata: { purpose, isNewUser },
      },
      undefined,
      request,
    );

    // TODO: Send email with OTP
    // This should be handled by MailService
    this.logger.log(`[OTP] ${purpose} code for ${normalizedEmail}: ${otp}`);
    await this.mailService.sendOtpLoginEmail(normalizedEmail, {
      displayName: user.displayName,
      otp,
      expiresInMinutes: this.configService.get<number>('OTP_PERIOD', 300) / 60,
      ipAddress: ipAddress || '',
    });

    return {
      message: 'OTP sent to your email',
      expiresIn: 600, // 10 minutes in seconds
    };
  }

  /**
   * Verify OTP and issue tokens
   */
  async verifyOtp(
    email: string,
    otp: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      await this.auditService.log(
        {
          action: AuditAction.OTP_FAILED,
          resource: 'User',
          metadata: { reason: 'User not found', email: normalizedEmail },
          success: false,
        },
        undefined,
        request,
      );
      throw new UnauthorizedException('Invalid email or OTP');
    }

    // Check account lock
    if (user.isLocked()) {
      await this.auditService.log(
        {
          action: AuditAction.ACCOUNT_LOCKED,
          resource: 'User',
          resourceId: user.id,
          metadata: { email: normalizedEmail },
        },
        undefined,
        request,
      );
      throw new UnauthorizedException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    // Verify OTP
    const secret = `${this.configService.getOrThrow<string>('OTP_SECRET')}:${normalizedEmail}:${user.otpPurpose}`;
    const result = await verify({
      token: otp,
      secret,
      strategy: OtpStrategy.TOTP,
    });

    if (!result.valid) {
      // Increment failed attempts
      await this.userRepository.incrementLoginAttempts(normalizedEmail);

      await this.auditService.log(
        {
          action: AuditAction.OTP_FAILED,
          resource: 'User',
          resourceId: user.id,
          metadata: { reason: 'Invalid OTP' },
          success: false,
        },
        undefined,
        request,
      );

      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Clear OTP
    await this.userRepository.clearOtp(normalizedEmail);

    // Record successful login
    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');

    // Build and issue tokens
    const isNewUser = !user.isEmailVerified;
    const tokens = await this.buildAndIssueTokens(
      user,
      null,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.LOGIN_OTP,
        resource: 'User',
        resourceId: user.id,
      },
      undefined,
      request,
    );

    return {
      ...tokens,
      isNewUser,
    };
  }

  /**
   * Handle Google OAuth login/registration
   */
  async handleGoogleAuth(
    profile: {
      googleId: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
    },
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { googleId, email, displayName, avatarUrl } = profile;
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user by Google ID
    let user = await this.userRepository.findByGoogleId(googleId);
    let isNewUser = false;

    if (!user) {
      // Check for existing user by email
      user = await this.userRepository.findByEmail(normalizedEmail);

      if (user) {
        // Link Google ID to existing user
        await this.userRepository.linkGoogleId(normalizedEmail, googleId);
        user = await this.userRepository.findById(user.id);
      } else {
        // Create new user
        user = await this.userRepository.create({
          email: normalizedEmail,
          googleId,
          displayName,
          avatarUrl,
          isEmailVerified: true,
          authProviders: ['google'],
        });
        isNewUser = true;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Failed to create or find user');
    }

    // Record login
    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');

    const tokens = await this.buildAndIssueTokens(
      user,
      null,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log({
      action: AuditAction.LOGIN_GOOGLE,
      resource: 'User',
      resourceId: user.id,
    });

    return {
      ...tokens,
      isNewUser,
    };
  }

  /**
   * Switch business context and issue new access token
   */
  async switchContext(
    userId: string,
    businessId: string | null,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<{ accessToken: string; context: AuthContextDto }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate business membership if businessId provided
    if (businessId) {
      const hasMembership = await this.membershipRepository.hasActiveMembership(
        userId,
        businessId,
      );
      if (!hasMembership && !user.isSystemUser) {
        throw new BadRequestException('Invalid business context');
      }
    }

    // Build new JWT payload
    const tokens = await this.buildAndIssueTokens(
      user,
      businessId,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.CONTEXT_SWITCHED,
        resource: 'User',
        resourceId: userId,
        metadata: { fromBusinessId: user.id, toBusinessId: businessId },
      },
      undefined,
      request,
    );

    return {
      accessToken: tokens.accessToken,
      context: tokens.context,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);

    // Find token
    const tokenDoc =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!tokenDoc || tokenDoc.isRevoked || tokenDoc.expiresAt < new Date()) {
      // Detect token reuse
      if (tokenDoc?.isRevoked) {
        // Revoke all tokens for this user
        await this.refreshTokenRepository.revokeAllForUser(tokenDoc.userId);

        await this.auditService.log(
          {
            action: AuditAction.REFRESH_TOKEN_REUSE_DETECTED,
            resource: 'User',
            resourceId: tokenDoc.userId.toString(),
            metadata: { tokenHash },
            success: false,
          },
          undefined,
          request,
        );

        throw new UnauthorizedException(
          'Security violation detected. All sessions terminated.',
        );
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.refreshTokenRepository.revoke(tokenDoc.id);

    // Get user
    const user = await this.userRepository.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Issue new tokens
    const newTokens = await this.generateTokenPair(
      user,
      null,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.REFRESH_TOKEN_USED,
        resource: 'User',
        resourceId: user.id,
      },
      undefined,
      request,
    );

    return newTokens;
  }

  /**
   * Logout - revoke refresh token(s)
   */
  async logout(
    userId: string,
    refreshToken?: string,
    request?: Request,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      // Revoke specific token
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenRepository.revokeByTokenHash(tokenHash);
    } else {
      // Revoke all tokens for user
      await this.refreshTokenRepository.revokeAllForUser(userId);
    }

    await this.auditService.log(
      {
        action: AuditAction.LOGOUT,
        resource: 'User',
        resourceId: userId,
        metadata: { specificToken: !!refreshToken },
      },
      undefined,
      request,
    );

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile with full context
   */
  async getMe(userId: string): Promise<{
    user: SafeUserDto;
    travellerProfile: unknown | null;
    systemProfile: unknown | null;
    memberships: MembershipInfoDto[];
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [travellerProfile, systemProfile, memberships] = await Promise.all([
      user.isTraveller
        ? this.travellerProfileRepository.findByUserId(userId)
        : Promise.resolve(null),
      user.isSystemUser
        ? this.systemUserProfileRepository.findByUserId(userId)
        : Promise.resolve(null),
      this.membershipRepository.findActiveByUserId(userId),
    ]);

    const membershipInfos: MembershipInfoDto[] = await Promise.all(
      memberships.map(async (m: BusinessMembershipDocument) => {
        const business = await this.businessRepository.findById(m.businessId);
        return {
          businessId: m.businessId.toString(),
          businessName: business?.name || 'Unknown',
          businessLogoUrl: business?.logoUrl || null,
          role: m.role,
          status: m.status,
        };
      }),
    );

    return {
      user: this.toSafeUserDto(user),
      travellerProfile,
      systemProfile,
      memberships: membershipInfos,
    };
  }

  /**
   * Build complete auth response with tokens
   */
  private async buildAndIssueTokens(
    user: UserDocument,
    activeBusinessId: string | null,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Get memberships
    const memberships = await this.membershipRepository.findActiveByUserId(
      user.id,
    );

    // Get active business details
    let activeBusiness = null;
    if (activeBusinessId) {
      activeBusiness = await this.businessRepository.findById(activeBusinessId);
    }

    // Find active membership
    const activeMembership = activeBusinessId
      ? memberships.find(
          (m: BusinessMembershipDocument) =>
            m.businessId.toString() === activeBusinessId,
        )
      : null;

    // Compute permissions
    const permissions = this.computePermissions(
      user.isTraveller,
      user.isSystemUser,
      activeMembership?.role as BusinessRole | undefined,
      activeMembership?.extraPermissions || [],
      activeMembership?.deniedPermissions || [],
    );

    // Build membership info
    const membershipInfos: MembershipInfoDto[] = await Promise.all(
      memberships.map(async (m: BusinessMembershipDocument) => {
        const business = await this.businessRepository.findById(m.businessId);
        return {
          businessId: m.businessId.toString(),
          businessName: business?.name || 'Unknown',
          businessLogoUrl: business?.logoUrl || null,
          role: m.role,
          status: m.status,
        };
      }),
    );

    // Build JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isTraveller: user.isTraveller,
      isSystemUser: user.isSystemUser,
      activeBusinessId: activeBusiness?.id || null,
      activeBusinessName: activeBusiness?.name || null,
      activeRole: activeMembership?.role || null,
      memberships: membershipInfos,
      permissions,
      featureFlags: this.computeFeatureFlags(permissions),
      iat: Math.floor(Date.now() / 1000),
      exp:
        Math.floor(Date.now() / 1000) + this.parseDuration(this.jwtExpiresIn),
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresInSeconds,
    });

    const refreshToken = await this.generateRefreshToken(
      user.id,
      deviceInfo,
      ipAddress,
    );

    const context: AuthContextDto = {
      activeBusinessId: payload.activeBusinessId,
      activeBusinessName: payload.activeBusinessName,
      activeRole: payload.activeRole,
      memberships: membershipInfos,
      permissions,
      featureFlags: payload.featureFlags,
    };

    return {
      accessToken,
      refreshToken,
      isNewUser: false,
      user: this.toSafeUserDto(user),
      context,
    };
  }

  /**
   * Generate token pair (access + refresh)
   */
  private async generateTokenPair(
    user: UserDocument,
    activeBusinessId: string | null,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await this.buildAndIssueTokens(
      user,
      activeBusinessId,
      deviceInfo,
      ipAddress,
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * Generate and store refresh token
   */
  private async generateRefreshToken(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Generate random token
    const tokenBytes = randomBytes(32);
    const token = tokenBytes.toString('base64url');
    const tokenHash = this.hashToken(token);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store hash
    await this.refreshTokenRepository.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      expiresAt,
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
      isRevoked: false,
    });

    return token;
  }

  /**
   * Compute effective permissions for user
   */
  private computePermissions(
    isTraveller: boolean,
    isSystemUser: boolean,
    activeRole?: BusinessRole,
    extraPermissions: string[] = [],
    deniedPermissions: string[] = [],
  ): string[] {
    const permissions = new Set<string>();

    // Traveller permissions
    if (isTraveller) {
      TRAVELLER_PERMISSIONS.forEach((p: string) => permissions.add(p));
    }

    // Business role permissions
    if (activeRole) {
      const rolePerms = ROLE_PERMISSIONS[activeRole] || [];
      rolePerms.forEach((p: string) => permissions.add(p));
    }

    // System user permissions
    if (isSystemUser) {
      // System permissions are handled separately via system role
      // This would need the actual system role to compute
      // For now, we assume the system role is passed via activeRole
    }

    // Add extra permissions
    extraPermissions.forEach((p) => permissions.add(p));

    // Remove denied permissions
    deniedPermissions.forEach((p: string) => permissions.delete(p));

    return Array.from(permissions);
  }

  /**
   * Compute feature flags from permissions
   */
  private computeFeatureFlags(permissions: string[]) {
    const has = (p: string) => permissions.includes(p);

    const isReadOnly =
      permissions.some((p) => p.includes(':read')) &&
      !permissions.some(
        (p) =>
          p.includes(':create') ||
          p.includes(':update') ||
          p.includes(':delete') ||
          p.includes(':manage'),
      );

    return {
      canManageBusiness: has('business:update') || has('business:create'),
      canInviteStaff: has('member:invite'),
      canViewFinance: has('finance:read'),
      canViewAudit: has('audit:read'),
      canCreateBookings: has('booking:create'),
      canSubmitKyc: has('kyc:submit'),
      canReviewKyc: has('kyc:review'),
      canManageUsers: has('user:create') || has('user:update'),
      isReadOnly,
      isSystemUser: has('system:manage'),
    };
  }

  /**
   * Convert user to safe DTO
   */
  private toSafeUserDto(user: UserDocument): SafeUserDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isTraveller: user.isTraveller,
      isSystemUser: user.isSystemUser,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Hash OTP for storage
   */
  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Hash refresh token for storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }
}
