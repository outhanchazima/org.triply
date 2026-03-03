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
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessStatus,
  CreateSystemUserDto,
  KycReviewDto,
  MembershipStatus,
  SystemRole,
  SystemUserProfileRepository,
  TravellerProfileRepository,
  UserRepository,
} from '@org.triply/database';
import type { JwtPayload } from '@org.triply/shared';
import { AuditService, MailService } from '@org.triply/shared';
import { UpdateSystemUserDto } from './dto/update-system-user.dto';

export interface PendingKycBusinessResponse {
  id: string;
  name: string;
  registrationNumber: string;
  status: string;
  owner: {
    id: string;
    email: string;
    displayName: string;
  };
  submittedAt: Date | null;
  createdAt: Date;
}

export interface SystemUserResponse {
  userId: string;
  email: string;
  displayName: string;
  isActive: boolean;
  role: SystemRole;
  firstName: string;
  lastName: string;
  department: string | null;
  provisionedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    this.assertSystemUser(actor);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const owner = await this.userRepository.findById(
      this.toStringId(business.ownerId),
    );
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
   * List businesses currently pending KYC review.
   */
  async listPendingKycBusinesses(): Promise<PendingKycBusinessResponse[]> {
    const businesses = await this.businessRepository.findPendingKycReview();

    return businesses.map((business) => {
      const owner = this.extractOwnerRef((business as any).ownerId);

      return {
        id: business.id,
        name: business.name,
        registrationNumber: business.registrationNumber,
        status: business.status,
        owner,
        submittedAt: business.kyc?.submittedAt ?? null,
        createdAt: business.createdAt,
      };
    });
  }

  /**
   * Suspend a business.
   */
  async suspendBusiness(
    actor: JwtPayload,
    businessId: string,
    request?: Request,
  ): Promise<{ id: string; status: string; message: string }> {
    this.assertSystemUser(actor);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.status === BusinessStatus.SUSPENDED) {
      return {
        id: business.id,
        status: business.status,
        message: 'Business is already suspended',
      };
    }

    const updated = await this.businessRepository.suspend(businessId);
    if (!updated) {
      throw new NotFoundException('Business not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_SUSPENDED,
        resource: 'Business',
        resourceId: businessId,
        before: { status: business.status },
        after: { status: updated.status },
      },
      actor,
      request,
    );

    return {
      id: updated.id,
      status: updated.status,
      message: 'Business suspended successfully',
    };
  }

  /**
   * Reactivate a suspended business.
   */
  async reactivateBusiness(
    actor: JwtPayload,
    businessId: string,
    request?: Request,
  ): Promise<{ id: string; status: string; message: string }> {
    this.assertSystemUser(actor);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const updated = await this.businessRepository.reactivate(businessId);
    if (!updated) {
      throw new NotFoundException('Business not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'Business',
        resourceId: businessId,
        before: { status: business.status },
        after: { status: updated.status },
      },
      actor,
      request,
    );

    return {
      id: updated.id,
      status: updated.status,
      message: 'Business reactivated successfully',
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
    this.assertSystemUser(actor);

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

  /**
   * List system users with optional role filter.
   */
  async listSystemUsers(role?: SystemRole): Promise<SystemUserResponse[]> {
    const profiles = role
      ? await this.systemProfileRepository.findByRole(role)
      : await this.systemProfileRepository.findAll();

    return profiles.map((profile) => {
      const userRef = this.extractUserRef((profile as any).userId);

      return {
        userId: userRef.userId,
        email: userRef.email,
        displayName: userRef.displayName,
        isActive: userRef.isActive,
        role: profile.role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        department: profile.department,
        provisionedBy: this.toStringId(profile.provisionedBy),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    });
  }

  /**
   * Get single system user by user ID.
   */
  async getSystemUser(userId: string): Promise<SystemUserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSystemUser) {
      throw new NotFoundException('System user not found');
    }

    const profile = await this.systemProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('System user profile not found');
    }

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      role: profile.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
      department: profile.department,
      provisionedBy: this.toStringId(profile.provisionedBy),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update system user profile/user state.
   */
  async updateSystemUser(
    actor: JwtPayload,
    userId: string,
    dto: UpdateSystemUserDto,
    request?: Request,
  ): Promise<SystemUserResponse> {
    this.assertSystemUser(actor);

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSystemUser) {
      throw new NotFoundException('System user not found');
    }

    const profile = await this.systemProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('System user profile not found');
    }

    if (actor.sub === userId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const profileUpdate: {
      role?: SystemRole;
      department?: string | null;
    } = {};

    if (dto.role !== undefined) {
      profileUpdate.role = dto.role;
    }

    if (dto.department !== undefined) {
      profileUpdate.department = dto.department;
    }

    const shouldUpdateProfile = Object.keys(profileUpdate).length > 0;
    const shouldUpdateUser = dto.isActive !== undefined;

    if (!shouldUpdateProfile && !shouldUpdateUser) {
      throw new BadRequestException('No valid fields provided for update');
    }

    if (shouldUpdateProfile) {
      await this.systemProfileRepository.updateByUserId(userId, profileUpdate);
    }

    if (shouldUpdateUser) {
      await this.userRepository.updateById(userId, { isActive: dto.isActive });
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'SystemUserProfile',
        resourceId: userId,
        before: {
          role: profile.role,
          department: profile.department,
          isActive: user.isActive,
        },
        after: {
          role: dto.role ?? profile.role,
          department: dto.department ?? profile.department,
          isActive: dto.isActive ?? user.isActive,
        },
      },
      actor,
      request,
    );

    return this.getSystemUser(userId);
  }

  private assertSystemUser(actor: JwtPayload): void {
    if (!actor.isSystemUser) {
      throw new ForbiddenException('System user access required');
    }
  }

  private extractOwnerRef(reference: unknown): {
    id: string;
    email: string;
    displayName: string;
  } {
    if (reference && typeof reference === 'object') {
      const record = reference as Record<string, unknown>;

      return {
        id: this.toStringId(reference),
        email: typeof record.email === 'string' ? record.email : '',
        displayName:
          typeof record.displayName === 'string'
            ? record.displayName
            : 'Unknown owner',
      };
    }

    return {
      id: this.toStringId(reference),
      email: '',
      displayName: 'Unknown owner',
    };
  }

  private extractUserRef(reference: unknown): {
    userId: string;
    email: string;
    displayName: string;
    isActive: boolean;
  } {
    if (reference && typeof reference === 'object') {
      const record = reference as Record<string, unknown>;

      return {
        userId: this.toStringId(reference),
        email: typeof record.email === 'string' ? record.email : '',
        displayName:
          typeof record.displayName === 'string'
            ? record.displayName
            : 'Unknown user',
        isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
      };
    }

    return {
      userId: this.toStringId(reference),
      email: '',
      displayName: 'Unknown user',
      isActive: true,
    };
  }

  private toStringId(reference: unknown): string {
    if (typeof reference === 'string') {
      return reference;
    }

    if (reference && typeof reference === 'object') {
      const record = reference as Record<string, unknown>;

      if (typeof record.id === 'string') {
        return record.id;
      }

      if (record._id) {
        return String(record._id);
      }
    }

    return String(reference ?? '');
  }
}
