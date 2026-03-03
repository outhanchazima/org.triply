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
  AdminApprovalActionType,
  AdminApprovalDocument,
  AdminApprovalRepository,
  AdminApprovalStatus,
  ApprovalMode,
  SYSTEM_APPROVAL_POLICY_DEFAULTS,
  ApprovalPolicyRepository,
  ApprovalScope,
  AuditAction,
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessStatus,
  CreateSystemUserDto,
  KycReviewDto,
  MembershipStatus,
  SystemRole,
  SystemUserAccessPolicyRepository,
  SystemUserProfileRepository,
  TravellerProfileRepository,
  UserRepository,
  normalizeApprovalActionKey,
  resolveDefaultSystemApprovalPolicy,
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

export interface PendingApprovalResponse {
  requiresApproval: true;
  approvalId: string;
  status: 'pending_approval';
  scope: ApprovalScope;
  actionType: AdminApprovalActionType;
  actionKey: string;
  businessId: string | null;
  message: string;
  expiresAt: Date;
}

export interface AdminApprovalResponse {
  id: string;
  scope: ApprovalScope;
  businessId: string | null;
  actionType: AdminApprovalActionType;
  actionKey: string;
  status: AdminApprovalStatus;
  requestedBy: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  payload: Record<string, unknown>;
  requestNote: string | null;
  approvalNote: string | null;
  rejectionReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemUserAccessPolicyResponse {
  userId: string;
  allowedIps: string[];
  deniedIps: string[];
  requireStepUpOnUnknownIp: boolean;
  requireStepUpOnUnknownDevice: boolean;
  notifyOnRiskEvent: boolean;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface SystemApprovalPolicyResponse {
  scope: ApprovalScope.SYSTEM;
  actionKey: string;
  mode: ApprovalMode;
  systemApproverRoles: SystemRole[];
  isEnabled: boolean;
  updatedBy: string | null;
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
    private readonly adminApprovalRepository: AdminApprovalRepository,
    private readonly approvalPolicyRepository: ApprovalPolicyRepository,
    private readonly systemUserAccessPolicyRepository: SystemUserAccessPolicyRepository,
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
    approvalId?: string,
    request?: Request,
  ): Promise<
    | { id: string; status: string; message: string; requiresApproval: false }
    | ({ id: string } & PendingApprovalResponse)
  > {
    this.assertSystemUser(actor);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const approvalGate = await this.resolveHighRiskApproval(
      actor,
      {
        actionType: AdminApprovalActionType.SUSPEND_BUSINESS,
        payload: { businessId },
        approvalId,
        requestNote: `Suspend business ${businessId}`,
      },
      request,
    );

    if (approvalGate.pending) {
      return {
        id: business.id,
        ...approvalGate.pending,
      };
    }

    if (business.status === BusinessStatus.SUSPENDED) {
      return {
        id: business.id,
        status: business.status,
        message: 'Business is already suspended',
        requiresApproval: false,
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

    if (approvalGate.approval) {
      await this.adminApprovalRepository.markExecuted(approvalGate.approval.id);
    }

    return {
      id: updated.id,
      status: updated.status,
      message: 'Business suspended successfully',
      requiresApproval: false,
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
    approvalId?: string,
    request?: Request,
  ): Promise<
    | {
        id: string;
        email: string;
        role: SystemRole;
        requiresApproval: false;
      }
    | ({
        id: null;
        email: string;
        role: SystemRole;
      } & PendingApprovalResponse)
  > {
    this.assertSystemUser(actor);
    let approvedRequest: AdminApprovalDocument | null = null;

    if (dto.role === SystemRole.SUPER_USER) {
      const normalizedPayload = {
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        department: dto.department?.trim() || null,
      };

      const approvalGate = await this.resolveHighRiskApproval(
        actor,
        {
          actionType: AdminApprovalActionType.PROVISION_SUPER_USER,
          payload: normalizedPayload,
          approvalId,
          requestNote: `Provision super user ${normalizedPayload.email}`,
        },
        request,
      );

      if (approvalGate.pending) {
        return {
          id: null,
          email: normalizedPayload.email,
          role: dto.role,
          ...approvalGate.pending,
        };
      }

      approvedRequest = approvalGate.approval;
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

    if (approvedRequest) {
      await this.adminApprovalRepository.markExecuted(approvedRequest.id);
    }

    return {
      id: user.id,
      email: user.email,
      role: dto.role,
      requiresApproval: false,
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

  /**
   * List high-risk approval requests.
   */
  async listApprovalRequests(
    actor: JwtPayload,
    input: {
      status?: AdminApprovalStatus;
      actionType?: AdminApprovalActionType;
      actionKey?: string;
      scope?: ApprovalScope;
      businessId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    approvals: AdminApprovalResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.assertSystemUser(actor);
    await this.adminApprovalRepository.expirePending();

    const page = Math.max(input.page || 1, 1);
    const limit = Math.min(Math.max(input.limit || 20, 1), 100);
    const { records, total } =
      await this.adminApprovalRepository.findManyWithFilters(
        {
          status: input.status,
          actionType: input.actionType,
          actionKey: input.actionKey,
          scope: input.scope,
          businessId: input.businessId,
        },
        page,
        limit,
      );

    return {
      approvals: records.map((record) => this.mapApproval(record)),
      total,
      page,
      limit,
    };
  }

  /**
   * Approve a pending high-risk request.
   */
  async approveHighRiskAction(
    actor: JwtPayload,
    approvalId: string,
    note?: string,
    request?: Request,
  ): Promise<AdminApprovalResponse> {
    this.assertSystemUser(actor);
    await this.adminApprovalRepository.expirePending();

    const approval = await this.adminApprovalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== AdminApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const requesterId = this.toStringId(approval.requestedBy);
    if (requesterId === actor.sub) {
      throw new ForbiddenException(
        'Requester cannot approve their own high-risk action',
      );
    }

    this.assertSystemApproverRole(
      actor,
      approval.requiredApproverSystemRoles || [],
    );

    const approved = await this.adminApprovalRepository.approve(
      approvalId,
      actor.sub,
      note,
    );

    if (!approved) {
      throw new BadRequestException(
        'Approval request is expired or no longer pending',
      );
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'AdminApproval',
        resourceId: approved.id,
        metadata: {
          event: 'approval_granted',
          actionType: approved.actionType,
          requestedBy: requesterId,
        },
      },
      actor,
      request,
    );

    return this.mapApproval(approved);
  }

  /**
   * Reject a pending high-risk request.
   */
  async rejectHighRiskAction(
    actor: JwtPayload,
    approvalId: string,
    reason: string,
    request?: Request,
  ): Promise<AdminApprovalResponse> {
    this.assertSystemUser(actor);
    await this.adminApprovalRepository.expirePending();

    const approval = await this.adminApprovalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== AdminApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const requesterId = this.toStringId(approval.requestedBy);
    if (requesterId === actor.sub) {
      throw new ForbiddenException(
        'Requester cannot reject their own high-risk action',
      );
    }

    this.assertSystemApproverRole(
      actor,
      approval.requiredApproverSystemRoles || [],
    );

    const rejected = await this.adminApprovalRepository.reject(
      approvalId,
      actor.sub,
      reason,
    );
    if (!rejected) {
      throw new BadRequestException('Failed to reject approval request');
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'AdminApproval',
        resourceId: rejected.id,
        metadata: {
          event: 'approval_rejected',
          actionType: rejected.actionType,
          requestedBy: requesterId,
          reason,
        },
      },
      actor,
      request,
    );

    return this.mapApproval(rejected);
  }

  /**
   * List system approval policies.
   */
  async listSystemApprovalPolicies(
    actor: JwtPayload,
  ): Promise<SystemApprovalPolicyResponse[]> {
    this.assertSystemUser(actor);

    const persisted = await this.approvalPolicyRepository.listByScope(
      ApprovalScope.SYSTEM,
    );
    const policyMap = new Map(
      persisted.map((policy) => [policy.actionKey, policy]),
    );

    const defaultActionKeys = SYSTEM_APPROVAL_POLICY_DEFAULTS.map(
      (policy) => policy.actionKey,
    );

    const merged = [...persisted];
    for (const actionKey of defaultActionKeys) {
      if (policyMap.has(actionKey)) {
        continue;
      }

      const defaults = resolveDefaultSystemApprovalPolicy(actionKey);
      merged.push({
        scope: ApprovalScope.SYSTEM,
        actionKey,
        mode: defaults.mode,
        systemApproverRoles: defaults.systemApproverRoles,
        isEnabled: true,
        updatedBy: null,
        updatedAt: new Date(0),
      } as any);
    }

    return merged.map((policy) => ({
      scope: ApprovalScope.SYSTEM,
      actionKey: policy.actionKey,
      mode: policy.mode,
      systemApproverRoles: [...(policy.systemApproverRoles || [])],
      isEnabled: policy.isEnabled,
      updatedBy: policy.updatedBy ? this.toStringId(policy.updatedBy) : null,
      updatedAt: policy.updatedAt,
    }));
  }

  /**
   * Upsert system approval policy for an action.
   */
  async upsertSystemApprovalPolicy(
    actor: JwtPayload,
    actionKey: string,
    input: {
      mode?: ApprovalMode;
      systemApproverRoles?: SystemRole[];
      isEnabled?: boolean;
    },
    request?: Request,
  ): Promise<SystemApprovalPolicyResponse> {
    this.assertSystemUser(actor);

    const normalizedActionKey = normalizeApprovalActionKey(actionKey);
    if (!normalizedActionKey) {
      throw new BadRequestException('actionKey is required');
    }

    const existing = await this.approvalPolicyRepository.findPolicy(
      ApprovalScope.SYSTEM,
      normalizedActionKey,
      null,
    );

    const defaultPolicy =
      resolveDefaultSystemApprovalPolicy(normalizedActionKey);
    const mode = input.mode || existing?.mode || defaultPolicy.mode;
    const systemApproverRoles = this.normalizeSystemRoles(
      input.systemApproverRoles ||
        existing?.systemApproverRoles ||
        defaultPolicy.systemApproverRoles,
    );

    if (
      mode === ApprovalMode.SECOND_APPROVAL &&
      systemApproverRoles.length === 0
    ) {
      throw new BadRequestException(
        'systemApproverRoles is required when mode is second_approval',
      );
    }

    const policy = await this.approvalPolicyRepository.upsertPolicy(
      ApprovalScope.SYSTEM,
      normalizedActionKey,
      {
        mode,
        systemApproverRoles,
        isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
        createdBy: existing?.createdBy || (actor.sub as any),
        updatedBy: actor.sub as any,
      } as any,
      null,
    );

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'ApprovalPolicy',
        resourceId: policy.id,
        metadata: {
          scope: ApprovalScope.SYSTEM,
          actionKey: normalizedActionKey,
          mode: policy.mode,
          systemApproverRoles: policy.systemApproverRoles,
          isEnabled: policy.isEnabled,
        },
      },
      actor,
      request,
    );

    return {
      scope: ApprovalScope.SYSTEM,
      actionKey: policy.actionKey,
      mode: policy.mode,
      systemApproverRoles: [...(policy.systemApproverRoles || [])],
      isEnabled: policy.isEnabled,
      updatedBy: policy.updatedBy ? this.toStringId(policy.updatedBy) : null,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * Fetch system-user access policy.
   */
  async getSystemUserAccessPolicy(
    actor: JwtPayload,
    userId: string,
  ): Promise<SystemUserAccessPolicyResponse> {
    this.assertSystemUser(actor);

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSystemUser) {
      throw new NotFoundException('System user not found');
    }

    const policy =
      await this.systemUserAccessPolicyRepository.findByUserId(userId);

    if (!policy) {
      return {
        userId,
        allowedIps: [],
        deniedIps: [],
        requireStepUpOnUnknownIp: true,
        requireStepUpOnUnknownDevice: true,
        notifyOnRiskEvent: true,
        updatedBy: null,
        updatedAt: null,
      };
    }

    return {
      userId,
      allowedIps: [...policy.allowedIps],
      deniedIps: [...policy.deniedIps],
      requireStepUpOnUnknownIp: policy.requireStepUpOnUnknownIp,
      requireStepUpOnUnknownDevice: policy.requireStepUpOnUnknownDevice,
      notifyOnRiskEvent: policy.notifyOnRiskEvent,
      updatedBy: policy.updatedBy ? this.toStringId(policy.updatedBy) : null,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * Update system-user access policy.
   */
  async updateSystemUserAccessPolicy(
    actor: JwtPayload,
    userId: string,
    input: {
      allowedIps?: string[];
      deniedIps?: string[];
      requireStepUpOnUnknownIp?: boolean;
      requireStepUpOnUnknownDevice?: boolean;
      notifyOnRiskEvent?: boolean;
    },
    request?: Request,
  ): Promise<SystemUserAccessPolicyResponse> {
    this.assertSystemUser(actor);

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isSystemUser) {
      throw new NotFoundException('System user not found');
    }

    const allowedIps =
      input.allowedIps !== undefined
        ? this.normalizeIpList(input.allowedIps)
        : undefined;
    const deniedIps =
      input.deniedIps !== undefined
        ? this.normalizeIpList(input.deniedIps)
        : undefined;

    const overlap =
      allowedIps && deniedIps
        ? allowedIps.filter((ip) => deniedIps.includes(ip))
        : [];
    if (overlap.length > 0) {
      throw new BadRequestException(
        `IPs cannot be present in both allow and deny lists: ${overlap.join(', ')}`,
      );
    }

    await this.systemUserAccessPolicyRepository.upsertByUserId(userId, {
      ...(allowedIps !== undefined ? { allowedIps } : {}),
      ...(deniedIps !== undefined ? { deniedIps } : {}),
      ...(input.requireStepUpOnUnknownIp !== undefined
        ? { requireStepUpOnUnknownIp: input.requireStepUpOnUnknownIp }
        : {}),
      ...(input.requireStepUpOnUnknownDevice !== undefined
        ? { requireStepUpOnUnknownDevice: input.requireStepUpOnUnknownDevice }
        : {}),
      ...(input.notifyOnRiskEvent !== undefined
        ? { notifyOnRiskEvent: input.notifyOnRiskEvent }
        : {}),
      updatedBy: actor.sub as any,
    } as any);

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'SystemUserAccessPolicy',
        resourceId: userId,
        metadata: {
          allowedIps: allowedIps ?? undefined,
          deniedIps: deniedIps ?? undefined,
          requireStepUpOnUnknownIp: input.requireStepUpOnUnknownIp,
          requireStepUpOnUnknownDevice: input.requireStepUpOnUnknownDevice,
          notifyOnRiskEvent: input.notifyOnRiskEvent,
        },
      },
      actor,
      request,
    );

    return this.getSystemUserAccessPolicy(actor, userId);
  }

  private async resolveHighRiskApproval(
    actor: JwtPayload,
    input: {
      actionType: AdminApprovalActionType;
      actionKey?: string;
      payload: Record<string, unknown>;
      approvalId?: string;
      requestNote?: string;
    },
    request?: Request,
  ): Promise<{
    pending?: PendingApprovalResponse;
    approval: AdminApprovalDocument | null;
  }> {
    await this.adminApprovalRepository.expirePending();
    const actionKey = normalizeApprovalActionKey(
      input.actionKey || input.actionType,
    );

    const policy = await this.resolveSystemActionPolicy(actionKey);

    if (policy.mode === ApprovalMode.AUTO_APPROVE || !policy.isEnabled) {
      return { approval: null };
    }

    if (!input.approvalId) {
      const pending = await this.adminApprovalRepository.createRequest({
        scope: ApprovalScope.SYSTEM,
        actionType: input.actionType,
        actionKey,
        payload: input.payload,
        requestedBy: actor.sub,
        requiredApproverSystemRoles: policy.systemApproverRoles,
        requestNote: input.requestNote || null,
      });

      await this.auditService.log(
        {
          action: AuditAction.USER_UPDATED,
          resource: 'AdminApproval',
          resourceId: pending.id,
          metadata: {
            event: 'approval_requested',
            actionType: input.actionType,
          },
        },
        actor,
        request,
      );

      return {
        approval: null,
        pending: {
          requiresApproval: true,
          approvalId: pending.id,
          status: 'pending_approval',
          scope: pending.scope,
          actionType: pending.actionType,
          actionKey: pending.actionKey,
          businessId: pending.businessId
            ? this.toStringId(pending.businessId)
            : null,
          message:
            'High-risk action requires approval from a different system admin',
          expiresAt: pending.expiresAt,
        },
      };
    }

    const approved = await this.adminApprovalRepository.findById(
      input.approvalId,
    );
    if (!approved) {
      throw new NotFoundException('Approval request not found');
    }

    if (approved.scope !== ApprovalScope.SYSTEM) {
      throw new BadRequestException('Approval request scope mismatch');
    }

    if (approved.actionType !== input.actionType) {
      throw new BadRequestException('Approval request action type mismatch');
    }

    if (approved.actionKey !== actionKey) {
      throw new BadRequestException('Approval request action key mismatch');
    }

    if (approved.status !== AdminApprovalStatus.APPROVED) {
      throw new BadRequestException('Approval request is not approved');
    }

    if (approved.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Approval request has expired');
    }

    if (this.toStringId(approved.requestedBy) !== actor.sub) {
      throw new ForbiddenException(
        'Only the original requester can execute an approved action',
      );
    }

    if (!this.isApprovalPayloadMatch(approved.payload, input.payload)) {
      throw new BadRequestException(
        'Approval request payload does not match the requested action',
      );
    }

    return { approval: approved };
  }

  private mapApproval(approval: AdminApprovalDocument): AdminApprovalResponse {
    return {
      id: approval.id,
      scope: approval.scope,
      businessId: approval.businessId
        ? this.toStringId(approval.businessId)
        : null,
      actionType: approval.actionType,
      actionKey: approval.actionKey,
      status: approval.status,
      requestedBy: this.toStringId(approval.requestedBy),
      approvedBy: approval.approvedBy
        ? this.toStringId(approval.approvedBy)
        : null,
      rejectedBy: approval.rejectedBy
        ? this.toStringId(approval.rejectedBy)
        : null,
      payload: approval.payload || {},
      requestNote: approval.requestNote || null,
      approvalNote: approval.approvalNote || null,
      rejectionReason: approval.rejectionReason || null,
      expiresAt: approval.expiresAt,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    };
  }

  private normalizeIpList(values: string[]): string[] {
    return Array.from(
      new Set(
        values.map((value) => value.trim()).filter((value) => value.length > 0),
      ),
    ).sort();
  }

  private isApprovalPayloadMatch(
    existingPayload: Record<string, unknown>,
    requestedPayload: Record<string, unknown>,
  ): boolean {
    const existingKeys = Object.keys(existingPayload).sort();
    const requestedKeys = Object.keys(requestedPayload).sort();

    if (existingKeys.join('|') !== requestedKeys.join('|')) {
      return false;
    }

    return requestedKeys.every((key) => {
      return (
        JSON.stringify(existingPayload[key]) ===
        JSON.stringify(requestedPayload[key])
      );
    });
  }

  private async resolveSystemActionPolicy(actionKey: string): Promise<{
    mode: ApprovalMode;
    systemApproverRoles: SystemRole[];
    isEnabled: boolean;
  }> {
    const existing = await this.approvalPolicyRepository.findPolicy(
      ApprovalScope.SYSTEM,
      actionKey,
      null,
    );

    if (existing) {
      return {
        mode: existing.mode,
        systemApproverRoles: [...(existing.systemApproverRoles || [])],
        isEnabled: existing.isEnabled,
      };
    }

    const defaults = resolveDefaultSystemApprovalPolicy(actionKey);
    return {
      mode: defaults.mode,
      systemApproverRoles: defaults.systemApproverRoles,
      isEnabled: true,
    };
  }

  private normalizeSystemRoles(roles: SystemRole[]): SystemRole[] {
    return Array.from(new Set(roles));
  }

  private assertSystemApproverRole(
    actor: JwtPayload,
    allowedRoles: SystemRole[],
  ): void {
    if (!allowedRoles || allowedRoles.length === 0) {
      return;
    }

    const actorRole = (actor.activeRole || '').trim() as SystemRole;
    if (!allowedRoles.includes(actorRole)) {
      throw new ForbiddenException(
        `Approver role not permitted. Allowed roles: ${allowedRoles.join(', ')}`,
      );
    }
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
