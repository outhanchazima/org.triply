// apps/triply.api/src/modules/admin/admin.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import {
  AuditAction,
  BusinessRepository,
  CreateSystemUserDto,
  KycReviewDto,
  MembershipStatus,
  SystemUserProfileRepository,
  UserRepository,
  BusinessMembershipRepository,
  TravellerProfileRepository,
  SystemRole,
  BusinessStatus,
} from '@org.triply/database';
import type { JwtPayload } from '@org.triply/shared';
import { AuditService, MailService } from '@org.triply/shared';

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly businessRepository: BusinessRepository,
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly travellerProfileRepository: TravellerProfileRepository,
    private readonly systemProfileRepository: SystemUserProfileRepository,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Review submitted KYC as system admin/super user.
   */
  async reviewKyc(
    actor: JwtPayload,
    businessId: string,
    dto: KycReviewDto,
    request?: Request,
  ): Promise<{ status: string; message: string }> {
    if (!actor.isSystemUser) {
      throw new ForbiddenException('System user access required');
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const owner = await this.userRepository.findById(business.ownerId);
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:4200',
    );

    if (dto.decision === 'approve') {
      await this.businessRepository.approveKyc(businessId, actor.sub);

      this.eventEmitter.emit('onboarding.kyc.reviewed', {
        businessId,
        decision: 'approve',
        actorId: actor.sub,
      });

      if (owner) {
        await this.mailService.sendKycApprovedEmail(owner.email, {
          firstName: owner.displayName.split(' ')[0] || owner.displayName,
          businessName: business.name,
          loginUrl: `${appUrl.replace(/\/$/, '')}/login`,
        });
      }

      await this.auditService.log(
        {
          action: AuditAction.KYC_APPROVED,
          resource: 'Business',
          resourceId: businessId,
          after: { status: BusinessStatus.ACTIVE },
        },
        actor,
        request,
      );

      return {
        status: BusinessStatus.ACTIVE,
        message: 'KYC approved successfully',
      };
    }

    if (!dto.rejectionReason) {
      throw new BadRequestException(
        'rejectionReason is required when rejecting KYC',
      );
    }

    await this.businessRepository.rejectKyc(
      businessId,
      actor.sub,
      dto.rejectionReason,
    );

    this.eventEmitter.emit('onboarding.kyc.reviewed', {
      businessId,
      decision: 'reject',
      actorId: actor.sub,
      rejectionReason: dto.rejectionReason,
    });

    if (owner) {
      await this.mailService.sendKycRejectedEmail(owner.email, {
        firstName: owner.displayName.split(' ')[0] || owner.displayName,
        businessName: business.name,
        rejectionReason: dto.rejectionReason,
        resubmitUrl: `${appUrl.replace(/\/$/, '')}/businesses/${businessId}/kyc`,
      });
    }

    await this.auditService.log(
      {
        action: AuditAction.KYC_REJECTED,
        resource: 'Business',
        resourceId: businessId,
        after: {
          status: BusinessStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
        },
      },
      actor,
      request,
    );

    return {
      status: BusinessStatus.REJECTED,
      message: 'KYC rejected',
    };
  }

  /**
   * Provision system users. System users are isolated from traveller/business identities.
   */
  async createSystemUser(
    actor: JwtPayload,
    dto: CreateSystemUserDto,
    request?: Request,
  ): Promise<{ id: string; email: string; role: SystemRole }> {
    if (!actor.isSystemUser) {
      throw new ForbiddenException('System user access required');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    let user = await this.userRepository.findByEmail(normalizedEmail);

    if (user) {
      if (user.isTraveller) {
        throw new BadRequestException(
          'Traveller users cannot be converted to system users',
        );
      }

      const memberships = await this.membershipRepository.findByUserId(user.id);
      const hasBusinessMembership = memberships.some(
        (membership) => membership.status !== MembershipStatus.LEFT,
      );

      if (hasBusinessMembership) {
        throw new BadRequestException(
          'Users with business memberships cannot be converted to system users',
        );
      }

      const travellerProfile =
        await this.travellerProfileRepository.findByUserId(user.id);
      if (travellerProfile) {
        throw new BadRequestException(
          'Users with traveller profiles cannot be converted to system users',
        );
      }

      const existingProfile = await this.systemProfileRepository.findByUserId(
        user.id,
      );
      if (existingProfile) {
        throw new ConflictException(
          'System user profile already exists for this user',
        );
      }

      const updated = await this.userRepository.updateByEmail(normalizedEmail, {
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
        isSystemUser: true,
        isTraveller: false,
        isEmailVerified: true,
        authProviders: ['otp'],
      });

      if (!updated) {
        throw new NotFoundException('Failed to update user');
      }

      user = updated;
    } else {
      user = await this.userRepository.create({
        email: normalizedEmail,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
        isSystemUser: true,
        isTraveller: false,
        isEmailVerified: true,
        authProviders: ['otp'],
      });
    }

    await this.systemProfileRepository.create({
      userId: user.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      department: dto.department || null,
      provisionedBy: actor.sub,
    } as any);

    await this.auditService.log(
      {
        action: AuditAction.USER_CREATED,
        resource: 'SystemUserProfile',
        resourceId: user.id,
        metadata: {
          role: dto.role,
          department: dto.department || null,
        },
      },
      actor,
      request,
    );

    return {
      id: user.id,
      email: user.email,
      role: dto.role,
    };
  }
}
