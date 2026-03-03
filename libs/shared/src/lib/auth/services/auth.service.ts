// libs/shared/src/lib/auth/services/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { generate } from 'otplib';
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
  SystemRole,
  MembershipStatus,
  TRAVELLER_PERMISSIONS,
  ROLE_PERMISSIONS,
  AuditAction,
  OtpPurpose,
  AuthResponseDto,
  SafeUserDto,
  MembershipInfoDto,
  AuthContextDto,
  Permission,
  SessionInfoDto,
  SystemUserAccessPolicyRepository,
} from '@org.triply/database';

import { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { AuditService } from '../../audit/services';
import { MailService } from '../../mail/services';

export enum OtpStrategy {
  TOTP = 'totp',
  HOTP = 'hotp',
}

interface SendOtpResult {
  user: UserDocument;
  otp: string;
  isNewUser: boolean;
  expiresInSeconds: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtExpiresInSeconds: number;
  private readonly otpSendWindowMs = 10 * 60 * 1000;
  private readonly otpSendLimit = 3;
  private readonly otpExpiryMs = 10 * 60 * 1000;
  private readonly otpSendHistoryByEmail = new Map<string, number[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly systemUserAccessPolicyRepository: SystemUserAccessPolicyRepository,
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
   * Send OTP for login/registration.
   */
  async sendOtp(
    email: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
    request?: Request,
  ): Promise<{ message: string; expiresIn: number }> {
    const result = await this.prepareOtp(email, purpose, request);

    this.logger.log(
      `[OTP] ${purpose} code for ${result.user.email}: ${result.otp}`,
    );

    await this.mailService.sendOtpLoginEmail(result.user.email, {
      displayName: result.user.displayName,
      otp: result.otp,
      expiresInMinutes: Math.floor(result.expiresInSeconds / 60),
      ipAddress: request?.ip || '',
    });

    return {
      message: 'OTP sent to your email',
      expiresIn: result.expiresInSeconds,
    };
  }

  /**
   * Send invitation OTP with invitation email template.
   */
  async sendInviteOtp(
    email: string,
    context: {
      firstName: string;
      inviterName: string;
      businessName: string;
      loginUrl: string;
    },
    request?: Request,
  ): Promise<{ message: string; expiresIn: number }> {
    const result = await this.prepareOtp(email, OtpPurpose.ONBOARDING, request);

    await this.mailService.sendInviteEmail(result.user.email, {
      firstName: context.firstName,
      inviterName: context.inviterName,
      businessName: context.businessName,
      otp: result.otp,
      loginUrl: context.loginUrl,
    });

    return {
      message: 'Invitation sent successfully',
      expiresIn: result.expiresInSeconds,
    };
  }

  /**
   * Verify OTP login and issue access/refresh tokens.
   */
  async verifyOtp(
    email: string,
    otp: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmailWithOtp(normalizedEmail);
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

    await this.ensureNotLocked(user, normalizedEmail, request);
    await this.enforceSystemUserRiskPolicies(
      user,
      deviceInfo,
      ipAddress,
      request,
      'otp',
    );

    if (!this.isStoredOtpValid(user, otp, OtpPurpose.LOGIN)) {
      await this.handleOtpFailure(
        user,
        normalizedEmail,
        'Invalid OTP',
        request,
      );
    }

    const isNewUser = !user.isEmailVerified;

    await this.userRepository.clearOtp(normalizedEmail);
    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');

    const freshUser = await this.userRepository.findById(user.id);
    if (!freshUser) {
      throw new UnauthorizedException('User not found after OTP verification');
    }

    const tokens = await this.buildAndIssueTokens(
      freshUser,
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
   * Verify step-up OTP and issue tokens for existing users.
   */
  async verifyStepUpOtp(
    email: string,
    otp: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmailWithOtp(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid step-up verification details');
    }

    await this.ensureNotLocked(user, normalizedEmail, request);
    await this.enforceSystemUserRiskPolicies(
      user,
      deviceInfo,
      ipAddress,
      request,
      'otp',
    );

    if (!this.isStoredOtpValid(user, otp, OtpPurpose.VERIFY_EMAIL)) {
      await this.handleOtpFailure(
        user,
        normalizedEmail,
        'Invalid step-up OTP',
        request,
      );
    }

    await this.userRepository.clearOtp(normalizedEmail);
    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');

    const freshUser = await this.userRepository.findById(user.id);
    if (!freshUser) {
      throw new UnauthorizedException('User not found after step-up');
    }

    const tokens = await this.buildAndIssueTokens(
      freshUser,
      null,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.LOGIN_OTP,
        resource: 'User',
        resourceId: user.id,
        metadata: { stepUp: true },
      },
      undefined,
      request,
    );

    return {
      ...tokens,
      isNewUser: false,
    };
  }

  /**
   * Accept invitation, activate membership, and issue tokens with business context.
   */
  async acceptInvite(
    email: string,
    otp: string,
    businessId: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmailWithOtp(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid invitation credentials');
    }

    await this.ensureNotLocked(user, normalizedEmail, request);

    const membership = await this.membershipRepository.findByUserAndBusiness(
      user.id,
      businessId,
    );

    if (!membership || membership.status !== MembershipStatus.INVITED) {
      throw new BadRequestException(
        'No pending invitation found for this business',
      );
    }

    if (!this.isStoredOtpValid(user, otp, OtpPurpose.ONBOARDING)) {
      await this.handleOtpFailure(
        user,
        normalizedEmail,
        'Invalid invite OTP',
        request,
      );
    }

    const isNewUser = !user.isEmailVerified;

    await this.userRepository.clearOtp(normalizedEmail);
    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');
    await this.membershipRepository.activateMembership(user.id, businessId);

    const freshUser = await this.userRepository.findById(user.id);
    if (!freshUser) {
      throw new UnauthorizedException(
        'User not found after invitation acceptance',
      );
    }

    const tokens = await this.buildAndIssueTokens(
      freshUser,
      businessId,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_JOINED,
        resource: 'BusinessMembership',
        resourceId: membership.id,
        metadata: { businessId },
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
   * Activate traveller profile for a non-system user and issue a new access token.
   */
  async activateTravellerProfile(
    userId: string,
    input: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      nationality?: string;
    },
    request?: Request,
  ): Promise<{ accessToken: string; message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isSystemUser) {
      throw new ForbiddenException(
        'System users cannot create traveller profiles',
      );
    }

    const existingProfile =
      await this.travellerProfileRepository.findByUserId(userId);
    if (existingProfile) {
      throw new BadRequestException('Traveller profile already exists');
    }

    await this.travellerProfileRepository.create({
      userId: new Types.ObjectId(userId),
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      nationality: input.nationality || null,
    } as any);

    await this.userRepository.activateTraveller(userId);

    const updatedUser = await this.userRepository.findById(userId);
    if (!updatedUser) {
      throw new UnauthorizedException(
        'User not found after traveller activation',
      );
    }

    const { payload } = await this.buildAuthPayload(updatedUser, null);
    const accessToken = this.signAccessToken(payload);

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'TravellerProfile',
        resourceId: userId,
        metadata: { activated: true },
      },
      undefined,
      request,
    );

    return {
      accessToken,
      message: 'Traveller profile activated',
    };
  }

  /**
   * Handle Google OAuth login/registration.
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
    request?: Request,
  ): Promise<AuthResponseDto> {
    const { googleId, email, displayName, avatarUrl } = profile;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await this.userRepository.findByGoogleId(googleId);
    let isNewUser = false;

    if (!user) {
      user = await this.userRepository.findByEmail(normalizedEmail);

      if (user) {
        await this.userRepository.linkGoogleId(normalizedEmail, googleId);
        user = await this.userRepository.findById(user.id);
      } else {
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

    await this.enforceSystemUserRiskPolicies(
      user,
      deviceInfo,
      ipAddress,
      request,
      'google',
    );

    await this.userRepository.recordLogin(normalizedEmail, ipAddress || '');

    const tokens = await this.buildAndIssueTokens(
      user,
      null,
      deviceInfo,
      ipAddress,
    );

    await this.auditService.log(
      {
        action: AuditAction.LOGIN_GOOGLE,
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
   * Switch active context and issue a new access token only.
   */
  async switchContext(
    userId: string,
    businessId: string | null,
    currentBusinessId?: string | null,
    request?: Request,
  ): Promise<{ accessToken: string; context: AuthContextDto }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isSystemUser && businessId) {
      throw new BadRequestException(
        'System users cannot switch into business contexts',
      );
    }

    if (businessId) {
      const hasMembership = await this.membershipRepository.hasActiveMembership(
        userId,
        businessId,
      );
      if (!hasMembership) {
        throw new BadRequestException('Invalid business context');
      }
    }

    const { payload, context } = await this.buildAuthPayload(user, businessId);
    const accessToken = this.signAccessToken(payload);

    await this.auditService.log(
      {
        action: AuditAction.CONTEXT_SWITCHED,
        resource: 'User',
        resourceId: userId,
        metadata: {
          fromBusinessId: currentBusinessId || null,
          toBusinessId: businessId,
        },
      },
      undefined,
      request,
    );

    return { accessToken, context };
  }

  /**
   * Refresh token pair (strict rotation).
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const tokenDoc =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!tokenDoc || tokenDoc.isRevoked || tokenDoc.expiresAt < new Date()) {
      if (tokenDoc?.isRevoked) {
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

    await this.refreshTokenRepository.revoke(tokenDoc.id);

    const user = await this.userRepository.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

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
   * Logout by revoking one refresh token or all tokens for the user.
   */
  async logout(
    userId: string,
    refreshToken?: string,
    request?: Request,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.refreshTokenRepository.revokeByTokenHash(tokenHash);
    } else {
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
   * List active refresh-token sessions for current user or admin-targeted user.
   */
  async listSessions(
    actor: JwtPayload,
    targetUserId?: string,
  ): Promise<{ userId: string; sessions: SessionInfoDto[] }> {
    const managedUserId = this.resolveSessionTargetUserId(actor, targetUserId);

    const user = await this.userRepository.findById(managedUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sessions =
      await this.refreshTokenRepository.findActiveByUserId(managedUserId);

    return {
      userId: managedUserId,
      sessions: sessions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((session) => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        })),
    };
  }

  /**
   * Revoke one active refresh-token session by ID.
   */
  async revokeSession(
    actor: JwtPayload,
    sessionId: string,
    targetUserId?: string,
    request?: Request,
  ): Promise<{ message: string }> {
    const managedUserId = this.resolveSessionTargetUserId(actor, targetUserId);

    const session = await this.refreshTokenRepository.findById(sessionId);
    if (!session || session.userId.toString() !== managedUserId) {
      throw new NotFoundException('Session not found');
    }

    if (session.isRevoked || session.expiresAt < new Date()) {
      return { message: 'Session already inactive' };
    }

    await this.refreshTokenRepository.revokeByIdForUser(
      sessionId,
      managedUserId,
    );

    await this.auditService.log(
      {
        action: AuditAction.LOGOUT,
        resource: 'RefreshToken',
        resourceId: sessionId,
        metadata: {
          managedUserId,
          operation: 'single_session_revoke',
        },
      },
      actor,
      request,
    );

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all active refresh-token sessions for current user or admin-targeted user.
   */
  async revokeAllSessions(
    actor: JwtPayload,
    targetUserId?: string,
    request?: Request,
  ): Promise<{ message: string; revokedCount: number }> {
    const managedUserId = this.resolveSessionTargetUserId(actor, targetUserId);

    const user = await this.userRepository.findById(managedUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeCount =
      await this.refreshTokenRepository.countActiveByUserId(managedUserId);
    await this.refreshTokenRepository.revokeAllForUser(managedUserId);

    await this.auditService.log(
      {
        action: AuditAction.LOGOUT,
        resource: 'RefreshToken',
        resourceId: managedUserId,
        metadata: {
          managedUserId,
          operation: 'revoke_all_sessions',
          revokedCount: activeCount,
        },
      },
      actor,
      request,
    );

    return {
      message: 'All sessions revoked successfully',
      revokedCount: activeCount,
    };
  }

  /**
   * Resolve current user profile, memberships, and optional profiles.
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

    const membershipInfos: MembershipInfoDto[] =
      await this.buildMembershipInfos(memberships);

    return {
      user: this.toSafeUserDto(user),
      travellerProfile,
      systemProfile,
      memberships: membershipInfos,
    };
  }

  /**
   * Build complete auth response with a new access token and refresh token.
   */
  private async buildAndIssueTokens(
    user: UserDocument,
    activeBusinessId: string | null,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { payload, context } = await this.buildAuthPayload(
      user,
      activeBusinessId,
    );

    const accessToken = this.signAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(
      user.id,
      deviceInfo,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      isNewUser: false,
      user: this.toSafeUserDto(user),
      context,
    };
  }

  /**
   * Generate token pair.
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
   * Build JWT payload and response context without issuing refresh tokens.
   */
  private async buildAuthPayload(
    user: UserDocument,
    requestedBusinessId: string | null,
  ): Promise<{ payload: JwtPayload; context: AuthContextDto }> {
    const [memberships, systemProfile] = await Promise.all([
      this.membershipRepository.findActiveByUserId(user.id),
      user.isSystemUser
        ? this.systemUserProfileRepository.findByUserId(user.id)
        : Promise.resolve(null),
    ]);

    const membershipInfos = await this.buildMembershipInfos(memberships);

    const activeMembership = requestedBusinessId
      ? memberships.find(
          (membership: BusinessMembershipDocument) =>
            membership.businessId.toString() === requestedBusinessId,
        )
      : null;

    let activeBusinessName: string | null = null;
    if (requestedBusinessId && activeMembership) {
      const business =
        await this.businessRepository.findById(requestedBusinessId);
      activeBusinessName = business?.name || null;
    }

    const businessRole = user.isSystemUser ? undefined : activeMembership?.role;
    const systemRole = user.isSystemUser ? systemProfile?.role || null : null;
    const effectiveActiveRole: string | null = user.isSystemUser
      ? systemRole
      : businessRole || null;

    const permissions = this.computePermissions(
      user.isTraveller,
      businessRole,
      systemRole,
      activeMembership?.extraPermissions || [],
      activeMembership?.deniedPermissions || [],
    );

    const featureFlags = this.computeFeatureFlags(
      permissions,
      user.isSystemUser,
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isTraveller: user.isTraveller,
      isSystemUser: user.isSystemUser,
      activeBusinessId: user.isSystemUser ? null : requestedBusinessId,
      activeBusinessName: user.isSystemUser ? null : activeBusinessName,
      activeRole: effectiveActiveRole,
      memberships: membershipInfos,
      permissions,
      featureFlags,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.jwtExpiresInSeconds,
    };

    const context: AuthContextDto = {
      activeBusinessId: payload.activeBusinessId,
      activeBusinessName: payload.activeBusinessName,
      activeRole: payload.activeRole,
      memberships: membershipInfos,
      permissions,
      featureFlags,
    };

    return { payload, context };
  }

  /**
   * Build membership info for the auth context and business switcher.
   */
  private async buildMembershipInfos(
    memberships: BusinessMembershipDocument[],
  ): Promise<MembershipInfoDto[]> {
    return Promise.all(
      memberships.map(async (membership: BusinessMembershipDocument) => {
        const business = await this.businessRepository.findById(
          membership.businessId,
        );

        return {
          businessId: membership.businessId.toString(),
          businessName: business?.name || 'Unknown',
          businessLogoUrl: business?.logoUrl || null,
          role: membership.role,
          status: membership.status,
        };
      }),
    );
  }

  /**
   * Generate and store a refresh token hash.
   */
  private async generateRefreshToken(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
   * Compute permissions for active context.
   */
  private computePermissions(
    isTraveller: boolean,
    activeBusinessRole?: BusinessRole,
    systemRole?: SystemRole | null,
    extraPermissions: string[] = [],
    deniedPermissions: string[] = [],
  ): string[] {
    const permissions = new Set<string>();

    if (isTraveller) {
      TRAVELLER_PERMISSIONS.forEach((permission: string) =>
        permissions.add(permission),
      );
    }

    if (activeBusinessRole) {
      (ROLE_PERMISSIONS[activeBusinessRole] || []).forEach(
        (permission: string) => permissions.add(permission),
      );
    }

    if (systemRole) {
      (ROLE_PERMISSIONS[systemRole] || []).forEach((permission: string) =>
        permissions.add(permission),
      );
    }

    extraPermissions.forEach((permission) => permissions.add(permission));
    deniedPermissions.forEach((permission) => permissions.delete(permission));

    return Array.from(permissions);
  }

  /**
   * Compute frontend feature flags from permissions.
   */
  private computeFeatureFlags(permissions: string[], isSystemUser: boolean) {
    const has = (permission: string) => permissions.includes(permission);

    const isReadOnly =
      permissions.some((permission) => permission.includes(':read')) &&
      !permissions.some(
        (permission) =>
          permission.includes(':create') ||
          permission.includes(':update') ||
          permission.includes(':delete') ||
          permission.includes(':manage') ||
          permission.includes(':approve') ||
          permission.includes(':reject'),
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
      isSystemUser,
    };
  }

  /**
   * Convert user document to safe DTO.
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
   * Prepare and store OTP for a given email and purpose.
   */
  private async prepareOtp(
    email: string,
    purpose: OtpPurpose,
    request?: Request,
  ): Promise<SendOtpResult> {
    const normalizedEmail = email.toLowerCase().trim();

    this.enforceEmailOtpRateLimit(normalizedEmail);

    let user = await this.userRepository.findByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      user = await this.userRepository.create({
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        isEmailVerified: false,
        authProviders: ['otp'],
      });
      isNewUser = true;
    }

    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed attempts. Please try again later.',
      );
    }

    const secret = `${this.configService.getOrThrow<string>('OTP_SECRET')}:${normalizedEmail}:${purpose}`;
    const otp = await generate({
      secret,
      strategy: OtpStrategy.TOTP,
      digits: 6,
      period: this.configService.get<number>('OTP_PERIOD', 300),
    });

    const expiresAt = new Date(Date.now() + this.otpExpiryMs);

    await this.userRepository.setOtp(
      normalizedEmail,
      this.hashOtp(otp),
      expiresAt,
      purpose,
    );
    await this.userRepository.addAuthProvider(normalizedEmail, 'otp');

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

    return {
      user,
      otp,
      isNewUser,
      expiresInSeconds: Math.floor(this.otpExpiryMs / 1000),
    };
  }

  /**
   * Ensure user account is not currently locked.
   */
  private async ensureNotLocked(
    user: UserDocument,
    email: string,
    request?: Request,
  ): Promise<void> {
    if (!user.isLocked()) {
      return;
    }

    await this.auditService.log(
      {
        action: AuditAction.ACCOUNT_LOCKED,
        resource: 'User',
        resourceId: user.id,
        metadata: { email },
      },
      undefined,
      request,
    );

    throw new UnauthorizedException(
      'Account is temporarily locked. Please try again later.',
    );
  }

  /**
   * Handle a failed OTP verification attempt.
   */
  private async handleOtpFailure(
    user: UserDocument,
    email: string,
    reason: string,
    request?: Request,
  ): Promise<never> {
    const updatedUser = await this.userRepository.incrementLoginAttempts(email);

    await this.auditService.log(
      {
        action: AuditAction.OTP_FAILED,
        resource: 'User',
        resourceId: user.id,
        metadata: { reason },
        success: false,
      },
      undefined,
      request,
    );

    if (updatedUser?.isLocked()) {
      await this.auditService.log(
        {
          action: AuditAction.ACCOUNT_LOCKED,
          resource: 'User',
          resourceId: user.id,
          metadata: { email },
        },
        undefined,
        request,
      );
    }

    throw new UnauthorizedException('Invalid or expired OTP');
  }

  /**
   * Validate submitted OTP against stored OTP hash/expiry/purpose.
   */
  private isStoredOtpValid(
    user: UserDocument,
    otp: string,
    expectedPurpose: OtpPurpose,
  ): boolean {
    if (!user.otpCode || !user.otpExpires || !user.otpPurpose) {
      return false;
    }

    if (user.otpPurpose !== expectedPurpose) {
      return false;
    }

    if (user.otpExpires.getTime() < Date.now()) {
      return false;
    }

    return this.hashOtp(otp) === user.otpCode;
  }

  /**
   * Enforce per-email OTP send rate limit.
   */
  private enforceEmailOtpRateLimit(email: string): void {
    const now = Date.now();
    const recent = (this.otpSendHistoryByEmail.get(email) || []).filter(
      (timestamp) => now - timestamp < this.otpSendWindowMs,
    );

    if (recent.length >= this.otpSendLimit) {
      throw new HttpException(
        'Too many OTP requests for this email. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.otpSendHistoryByEmail.set(email, recent);
  }

  /**
   * Enforce system-user IP/device risk policies.
   */
  private async enforceSystemUserRiskPolicies(
    user: UserDocument,
    deviceInfo?: string,
    ipAddress?: string,
    request?: Request,
    provider: 'otp' | 'google' = 'otp',
  ): Promise<void> {
    if (!user.isSystemUser) {
      return;
    }

    const policy = await this.systemUserAccessPolicyRepository.findByUserId(
      user.id,
    );
    if (!policy) {
      return;
    }

    const normalizedIp = ipAddress?.trim() || '';

    if (normalizedIp && policy.deniedIps.includes(normalizedIp)) {
      await this.auditService.log(
        {
          action: AuditAction.SUSPICIOUS_ACTIVITY,
          resource: 'User',
          resourceId: user.id,
          metadata: {
            reason: 'ip_denylist_match',
            ipAddress: normalizedIp,
          },
          success: false,
        },
        undefined,
        request,
      );

      if (policy.notifyOnRiskEvent) {
        const appUrl = this.configService.get<string>(
          'APP_URL',
          'http://localhost:4200',
        );

        await this.mailService.sendSecurityAlert(user.email, {
          displayName: user.displayName,
          alertType: 'Denied login attempt from blocked IP',
          ipAddress: normalizedIp,
          timestamp: new Date(),
          actionUrl: `${appUrl.replace(/\/$/, '')}/security`,
        });
      }

      throw new ForbiddenException('Access blocked by system IP policy');
    }

    if (
      normalizedIp &&
      policy.allowedIps.length > 0 &&
      !policy.allowedIps.includes(normalizedIp)
    ) {
      await this.auditService.log(
        {
          action: AuditAction.SUSPICIOUS_ACTIVITY,
          resource: 'User',
          resourceId: user.id,
          metadata: {
            reason: 'ip_not_in_allowlist',
            ipAddress: normalizedIp,
          },
          success: false,
        },
        undefined,
        request,
      );

      throw new ForbiddenException(
        'IP address is not permitted for this account',
      );
    }

    const activeSessions = await this.refreshTokenRepository.findActiveByUserId(
      user.id,
    );
    const knownIps = new Set(
      activeSessions
        .map((session) => session.ipAddress || '')
        .filter((value) => value.length > 0),
    );
    const knownDevices = new Set(
      activeSessions
        .map((session) => session.deviceInfo || '')
        .filter((value) => value.length > 0),
    );

    const isUnknownIp =
      normalizedIp.length > 0 &&
      knownIps.size > 0 &&
      !knownIps.has(normalizedIp);
    const normalizedDevice = deviceInfo?.trim() || '';
    const isUnknownDevice =
      normalizedDevice.length > 0 &&
      knownDevices.size > 0 &&
      !knownDevices.has(normalizedDevice);

    if (!isUnknownIp && !isUnknownDevice) {
      return;
    }

    await this.auditService.log(
      {
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        resource: 'User',
        resourceId: user.id,
        metadata: {
          reason: 'unusual_access_pattern',
          provider,
          ipAddress: normalizedIp || null,
          deviceInfo: normalizedDevice || null,
          isUnknownIp,
          isUnknownDevice,
        },
      },
      undefined,
      request,
    );

    if (policy.notifyOnRiskEvent) {
      const appUrl = this.configService.get<string>(
        'APP_URL',
        'http://localhost:4200',
      );

      await this.mailService.sendSecurityAlert(user.email, {
        displayName: user.displayName,
        alertType: 'Unusual system-user login pattern detected',
        ipAddress: normalizedIp || 'Unknown',
        timestamp: new Date(),
        actionUrl: `${appUrl.replace(/\/$/, '')}/security`,
      });
    }

    const requiresStepUp =
      provider === 'google' &&
      ((policy.requireStepUpOnUnknownIp && isUnknownIp) ||
        (policy.requireStepUpOnUnknownDevice && isUnknownDevice));

    if (!requiresStepUp) {
      return;
    }

    const otpResult = await this.sendOtp(
      user.email,
      OtpPurpose.VERIFY_EMAIL,
      request,
    );

    throw new HttpException(
      {
        message: 'Step-up verification required',
        code: 'STEP_UP_REQUIRED',
        email: user.email,
        expiresIn: otpResult.expiresIn,
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }

  /**
   * Resolve target user for session management operations.
   */
  private resolveSessionTargetUserId(
    actor: JwtPayload,
    targetUserId?: string,
  ): string {
    if (!targetUserId || targetUserId === actor.sub) {
      return actor.sub;
    }

    const canManageOtherUsers =
      actor.permissions.includes(Permission.USER_UPDATE) ||
      actor.permissions.includes(Permission.USER_DELETE);

    if (!canManageOtherUsers) {
      throw new ForbiddenException(
        'Insufficient permissions to manage other user sessions',
      );
    }

    return targetUserId;
  }

  /**
   * Sign an access token from JWT payload.
   */
  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresInSeconds,
    });
  }

  /**
   * Hash OTP for secure storage.
   */
  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Hash refresh token for secure storage.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse duration string (e.g. 15m, 7d) to seconds.
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900;
    }

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
