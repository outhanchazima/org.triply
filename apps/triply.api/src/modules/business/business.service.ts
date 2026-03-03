// apps/triply.api/src/modules/business/business.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  AuditAction,
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessRole,
  InviteMemberDto,
  MembershipStatus,
  Permission,
  UpdateMemberPermissionsDto,
  UpdateMemberRoleDto,
  UserRepository,
} from '@org.triply/database';
import { AuditService, AuthService } from '@org.triply/shared';
import type { JwtPayload } from '@org.triply/shared';
import { UpdateBusinessDto } from './dto/update-business.dto';

export interface BusinessContextSummary {
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  role: string;
  status: string;
  joinedAt: Date | null;
  invitedAt: Date | null;
  isActiveContext: boolean;
}

export interface BusinessMemberResponse {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  extraPermissions: string[];
  deniedPermissions: string[];
  joinedAt: Date | null;
  invitedAt: Date | null;
}

export interface BusinessDetailsResponse {
  id: string;
  name: string;
  registrationNumber: string;
  status: string;
  ownerId: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  createdAt: Date;
  updatedAt: Date;
  kyc: {
    businessType: string | null;
    hasTaxId: boolean;
    incorporationDate: Date | null;
    address: Record<string, unknown> | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
    documents: {
      type: string;
      uploadedAt: Date;
      verified: boolean;
      hasFile: boolean;
    }[];
  };
}

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
   * List all businesses for the authenticated user.
   */
  async listMyBusinesses(
    actor: JwtPayload,
  ): Promise<{ businesses: BusinessContextSummary[] }> {
    if (actor.isSystemUser) {
      throw new ForbiddenException(
        'System users do not have business memberships',
      );
    }

    const memberships = await this.membershipRepository.findByUserId(actor.sub);

    return {
      businesses: memberships.map((membership) => {
        const business = this.extractBusinessRef(membership.businessId);

        return {
          businessId: business.businessId,
          businessName: business.businessName,
          businessLogoUrl: business.businessLogoUrl,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt ?? null,
          invitedAt: membership.invitedAt ?? null,
          isActiveContext: actor.activeBusinessId === business.businessId,
        };
      }),
    };
  }

  /**
   * Fetch a single business in the active business context.
   */
  async getBusiness(
    actor: JwtPayload,
    businessId: string,
  ): Promise<BusinessDetailsResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.BUSINESS_READ,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.mapBusinessDetails(business as any);
  }

  /**
   * Update basic editable business fields.
   */
  async updateBusiness(
    actor: JwtPayload,
    businessId: string,
    dto: UpdateBusinessDto,
    request?: Request,
  ): Promise<BusinessDetailsResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.BUSINESS_UPDATE,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const updateData: {
      name?: string;
      website?: string | null;
      industry?: string | null;
      logoUrl?: string | null;
    } = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.website !== undefined) {
      updateData.website = dto.website;
    }
    if (dto.industry !== undefined) {
      updateData.industry = dto.industry.trim();
    }
    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const updated = await this.businessRepository.updateById(
      businessId,
      updateData,
    );
    if (!updated) {
      throw new NotFoundException('Business not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'Business',
        resourceId: businessId,
        before: {
          name: business.name,
          website: business.website,
          industry: business.industry,
          logoUrl: business.logoUrl,
        },
        after: {
          name: updated.name,
          website: updated.website,
          industry: updated.industry,
          logoUrl: updated.logoUrl,
        },
      },
      actor,
      request,
    );

    return this.mapBusinessDetails(updated as any);
  }

  /**
   * List all members for a business.
   */
  async listMembers(
    actor: JwtPayload,
    businessId: string,
  ): Promise<{ businessId: string; members: BusinessMemberResponse[] }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const members =
      await this.membershipRepository.findByBusinessId(businessId);

    return {
      businessId,
      members: members.map((membership) => {
        const user = this.extractUserRef(membership.userId);

        return {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          status: membership.status,
          extraPermissions: [...(membership.extraPermissions || [])],
          deniedPermissions: [...(membership.deniedPermissions || [])],
          joinedAt: membership.joinedAt ?? null,
          invitedAt: membership.invitedAt ?? null,
        };
      }),
    };
  }

  /**
   * Invite a user to a business and send OTP invitation email.
   */
  async inviteMember(
    actor: JwtPayload,
    businessId: string,
    dto: InviteMemberDto,
    request?: Request,
  ): Promise<{ message: string; businessId: string; memberEmail: string }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_INVITE,
    );

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

  /**
   * Update a member's role in the business.
   */
  async updateMemberRole(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    request?: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    role: string;
    status: string;
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    if (actor.sub === userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership || membership.status === MembershipStatus.LEFT) {
      throw new NotFoundException('Business membership not found');
    }

    if (membership.role === BusinessRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Owner role cannot be reassigned');
    }

    const updated = await this.membershipRepository.updateRole(
      userId,
      businessId,
      dto.role,
    );

    if (!updated) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_ROLE_CHANGED,
        resource: 'BusinessMembership',
        resourceId: updated.id,
        metadata: {
          businessId,
          targetUserId: userId,
          previousRole: membership.role,
          newRole: updated.role,
        },
      },
      actor,
      request,
    );

    return {
      businessId,
      userId,
      role: updated.role,
      status: updated.status,
    };
  }

  /**
   * Update per-member permission overrides for a business.
   */
  async updateMemberPermissions(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    dto: UpdateMemberPermissionsDto,
    request?: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    extraPermissions: string[];
    deniedPermissions: string[];
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership || membership.status === MembershipStatus.LEFT) {
      throw new NotFoundException('Business membership not found');
    }

    const updated = await this.membershipRepository.updatePermissions(
      userId,
      businessId,
      dto.extraPermissions,
      dto.deniedPermissions,
    );

    if (!updated) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'BusinessMembership',
        resourceId: updated.id,
        metadata: {
          businessId,
          targetUserId: userId,
          extraPermissions: dto.extraPermissions,
          deniedPermissions: dto.deniedPermissions,
        },
      },
      actor,
      request,
    );

    return {
      businessId,
      userId,
      extraPermissions: [...(updated.extraPermissions || [])],
      deniedPermissions: [...(updated.deniedPermissions || [])],
    };
  }

  /**
   * Suspend a business member.
   */
  async suspendMember(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    request?: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    if (actor.sub === userId) {
      throw new BadRequestException('You cannot suspend yourself');
    }

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership || membership.status === MembershipStatus.LEFT) {
      throw new NotFoundException('Business membership not found');
    }

    if (membership.role === BusinessRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Owner cannot be suspended');
    }

    const updated = await this.membershipRepository.suspendMember(
      userId,
      businessId,
    );

    if (!updated) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'BusinessMembership',
        resourceId: updated.id,
        metadata: {
          businessId,
          targetUserId: userId,
          status: MembershipStatus.SUSPENDED,
        },
      },
      actor,
      request,
    );

    return {
      message: 'Member suspended',
      businessId,
      userId,
      status: updated.status,
    };
  }

  /**
   * Activate a business member.
   */
  async activateMember(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    request?: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership || membership.status === MembershipStatus.LEFT) {
      throw new NotFoundException('Business membership not found');
    }

    const updated = await this.membershipRepository.activateMembership(
      userId,
      businessId,
    );

    if (!updated) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'BusinessMembership',
        resourceId: updated.id,
        metadata: {
          businessId,
          targetUserId: userId,
          status: MembershipStatus.ACTIVE,
        },
      },
      actor,
      request,
    );

    return {
      message: 'Member activated',
      businessId,
      userId,
      status: updated.status,
    };
  }

  /**
   * Remove member from business (soft-delete membership as left).
   */
  async removeMember(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    request?: Request,
  ): Promise<{
    message: string;
    businessId: string;
    userId: string;
    status: string;
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_REMOVE,
    );

    if (actor.sub === userId) {
      throw new BadRequestException(
        'You cannot remove yourself from this endpoint',
      );
    }

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership || membership.status === MembershipStatus.LEFT) {
      throw new NotFoundException('Business membership not found');
    }

    if (membership.role === BusinessRole.BUSINESS_OWNER) {
      throw new ForbiddenException('Owner cannot be removed');
    }

    const updated = await this.membershipRepository.removeMember(
      userId,
      businessId,
    );

    if (!updated) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_REMOVED,
        resource: 'BusinessMembership',
        resourceId: updated.id,
        metadata: {
          businessId,
          targetUserId: userId,
        },
      },
      actor,
      request,
    );

    return {
      message: 'Member removed',
      businessId,
      userId,
      status: updated.status,
    };
  }

  private async assertBusinessScopedAccess(
    actor: JwtPayload,
    businessId: string,
    permission?: Permission,
  ): Promise<void> {
    if (actor.isSystemUser) {
      throw new ForbiddenException(
        'System users cannot access business endpoints',
      );
    }

    if (actor.activeBusinessId !== businessId) {
      throw new ForbiddenException('Active business context mismatch');
    }

    if (permission && !actor.permissions.includes(permission)) {
      throw new ForbiddenException(
        `Missing required permission: ${permission}`,
      );
    }

    const membership = await this.membershipRepository.findByUserAndBusiness(
      actor.sub,
      businessId,
    );

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Active business membership required');
    }
  }

  private mapBusinessDetails(business: {
    id: string;
    name: string;
    registrationNumber: string;
    status: string;
    ownerId: unknown;
    logoUrl: string | null;
    website: string | null;
    industry: string | null;
    createdAt: Date;
    updatedAt: Date;
    kyc?: {
      businessType?: string | null;
      taxId?: string | null;
      incorporationDate?: Date | null;
      address?: Record<string, unknown> | null;
      submittedAt?: Date | null;
      reviewedAt?: Date | null;
      reviewedBy?: unknown;
      rejectionReason?: string | null;
      documents?: Array<{
        type: string;
        uploadedAt: Date;
        verified: boolean;
        fileId?: unknown;
      }>;
    };
  }): BusinessDetailsResponse {
    return {
      id: business.id,
      name: business.name,
      registrationNumber: business.registrationNumber,
      status: business.status,
      ownerId: this.toStringId(business.ownerId),
      logoUrl: business.logoUrl,
      website: business.website,
      industry: business.industry,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      kyc: {
        businessType: business.kyc?.businessType ?? null,
        hasTaxId: Boolean(business.kyc?.taxId),
        incorporationDate: business.kyc?.incorporationDate ?? null,
        address: business.kyc?.address ?? null,
        submittedAt: business.kyc?.submittedAt ?? null,
        reviewedAt: business.kyc?.reviewedAt ?? null,
        reviewedBy: business.kyc?.reviewedBy
          ? this.toStringId(business.kyc.reviewedBy)
          : null,
        rejectionReason: business.kyc?.rejectionReason ?? null,
        documents: (business.kyc?.documents ?? []).map((document) => ({
          type: document.type,
          uploadedAt: document.uploadedAt,
          verified: document.verified,
          hasFile: Boolean(document.fileId),
        })),
      },
    };
  }

  private extractBusinessRef(reference: unknown): {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
  } {
    if (reference && typeof reference === 'object') {
      const record = reference as Record<string, unknown>;

      return {
        businessId: this.toStringId(reference),
        businessName:
          typeof record.name === 'string' ? record.name : 'Unknown business',
        businessLogoUrl:
          typeof record.logoUrl === 'string' ? record.logoUrl : null,
      };
    }

    return {
      businessId: this.toStringId(reference),
      businessName: 'Unknown business',
      businessLogoUrl: null,
    };
  }

  private extractUserRef(reference: unknown): {
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
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
        avatarUrl:
          typeof record.avatarUrl === 'string' ? record.avatarUrl : null,
      };
    }

    return {
      userId: this.toStringId(reference),
      email: '',
      displayName: 'Unknown user',
      avatarUrl: null,
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
