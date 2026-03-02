// apps/triply.api/src/modules/business/business.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessRole,
  InviteMemberDto,
  MembershipStatus,
  Permission,
  UserRepository,
} from '@org.triply/database';
import { AuthService } from '@org.triply/shared';
import type { Request } from 'express';
import { AuditService } from '@org.triply/shared';
import type { JwtPayload } from '@org.triply/shared';

@Injectable()
export class BusinessService {
  constructor(
    private readonly configService: ConfigService,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Invite a user to a business and send OTP invitation email.
   */
  async inviteMember(
    actor: JwtPayload,
    businessId: string,
    dto: InviteMemberDto,
    request?: Request,
  ): Promise<{ message: string; businessId: string; memberEmail: string }> {
    if (actor.isSystemUser) {
      throw new ForbiddenException(
        'System users cannot access business endpoints',
      );
    }

    if (actor.activeBusinessId !== businessId) {
      throw new ForbiddenException('Active business context mismatch');
    }

    if (!actor.permissions.includes(Permission.MEMBER_INVITE)) {
      throw new ForbiddenException(
        'Missing required permission: member:invite',
      );
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    let invitedUser = await this.userRepository.findByEmail(normalizedEmail);

    if (invitedUser?.isSystemUser) {
      throw new BadRequestException(
        'System users cannot be invited to business memberships',
      );
    }

    if (!invitedUser) {
      invitedUser = await this.userRepository.create({
        email: normalizedEmail,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
        isEmailVerified: false,
        authProviders: ['otp'],
      });
    }

    const existingMembership =
      await this.membershipRepository.findByUserAndBusiness(
        invitedUser.id,
        businessId,
      );

    if (existingMembership?.status === MembershipStatus.ACTIVE) {
      throw new ConflictException(
        'User is already an active member of this business',
      );
    }

    const membership = await this.membershipRepository.upsertInvitation(
      invitedUser.id,
      businessId,
      dto.role as BusinessRole,
      actor.sub,
    );

    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:4200',
    );
    const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;

    await this.authService.sendInviteOtp(
      normalizedEmail,
      {
        firstName: dto.firstName,
        inviterName: actor.displayName,
        businessName: business.name,
        loginUrl,
      },
      request,
    );

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_INVITED,
        resource: 'BusinessMembership',
        resourceId: membership.id,
        metadata: {
          businessId,
          email: normalizedEmail,
          role: dto.role,
        },
      },
      actor,
      request,
    );

    return {
      message: 'Invitation sent',
      businessId,
      memberEmail: normalizedEmail,
    };
  }
}
