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
  AdminApprovalActionType,
  AdminApprovalRepository,
  AdminApprovalStatus,
  ApprovalMode,
  BUSINESS_APPROVAL_POLICY_DEFAULTS,
  ApprovalPolicyRepository,
  ApprovalScope,
  AuditAction,
  BusinessMembershipRepository,
  BusinessRepository,
  BusinessRole,
  BusinessRoleTemplateRepository,
  InviteMemberDto,
  MembershipStatus,
  Permission,
  UpdateMemberPermissionsDto,
  UpdateMemberRoleDto,
  UserRepository,
  normalizeApprovalActionKey,
  resolveDefaultBusinessApprovalPolicy,
} from '@org.triply/database';
import { AuditService, AuthService } from '@org.triply/shared';
import type { JwtPayload } from '@org.triply/shared';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
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

export interface InviteHistoryEvent {
  action: string;
  success: boolean;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface InviteHistoryResponse {
  membershipId: string;
  businessId: string;
  userId: string;
  status: string;
  role: string;
  invitedAt: Date | null;
  joinedAt: Date | null;
  events: InviteHistoryEvent[];
}

export interface OwnershipTransferStatusResponse {
  businessId: string;
  status: 'none' | 'pending' | 'accepted';
  currentOwnerId: string;
  proposedOwnerId: string | null;
  initiatedBy: string | null;
  initiatedAt: Date | null;
  acceptedAt: Date | null;
}

export interface RoleTemplateResponse {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  baseRole: string;
  extraPermissions: string[];
  deniedPermissions: string[];
  isActive: boolean;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessApprovalPolicyResponse {
  scope: ApprovalScope.BUSINESS;
  businessId: string;
  actionKey: string;
  mode: ApprovalMode;
  businessApproverRoles: BusinessRole[];
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface BusinessApprovalResponse {
  id: string;
  scope: ApprovalScope;
  businessId: string | null;
  actionType: AdminApprovalActionType;
  actionKey: string;
  status: AdminApprovalStatus;
  requestedBy: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  requestNote: string | null;
  approvalNote: string | null;
  rejectionReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

@Injectable()
export class BusinessService {
  constructor(
    private readonly configService: ConfigService,
    private readonly businessRepository: BusinessRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly adminApprovalRepository: AdminApprovalRepository,
    private readonly approvalPolicyRepository: ApprovalPolicyRepository,
    private readonly roleTemplateRepository: BusinessRoleTemplateRepository,
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
   * List business approval workflow policies.
   */
  async listApprovalPolicies(
    actor: JwtPayload,
    businessId: string,
  ): Promise<{
    businessId: string;
    policies: BusinessApprovalPolicyResponse[];
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    const policies = await this.approvalPolicyRepository.listByScope(
      ApprovalScope.BUSINESS,
      businessId,
    );
    const policyMap = new Map(
      policies.map((policy) => [policy.actionKey, policy]),
    );

    const merged = [...policies];
    for (const defaults of BUSINESS_APPROVAL_POLICY_DEFAULTS) {
      if (policyMap.has(defaults.actionKey)) {
        continue;
      }

      merged.push({
        scope: ApprovalScope.BUSINESS,
        businessId: businessId as any,
        actionKey: defaults.actionKey,
        mode: defaults.mode,
        businessApproverRoles: defaults.businessApproverRoles,
        isEnabled: true,
        updatedBy: null,
        updatedAt: new Date(0),
      } as any);
    }

    return {
      businessId,
      policies: merged
        .sort((a, b) => a.actionKey.localeCompare(b.actionKey))
        .map((policy) => ({
          scope: ApprovalScope.BUSINESS,
          businessId,
          actionKey: policy.actionKey,
          mode: policy.mode,
          businessApproverRoles: [...(policy.businessApproverRoles || [])],
          isEnabled: policy.isEnabled,
          updatedBy: policy.updatedBy
            ? this.toStringId(policy.updatedBy)
            : null,
          updatedAt: policy.updatedAt,
        })),
    };
  }

  /**
   * Upsert a business approval workflow policy by action key.
   */
  async upsertApprovalPolicy(
    actor: JwtPayload,
    businessId: string,
    actionKey: string,
    input: {
      mode?: ApprovalMode;
      businessApproverRoles?: BusinessRole[];
      isEnabled?: boolean;
    },
    request?: Request,
  ): Promise<BusinessApprovalPolicyResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.BUSINESS_UPDATE,
    );

    const normalizedActionKey = normalizeApprovalActionKey(actionKey);
    if (!normalizedActionKey) {
      throw new BadRequestException('actionKey is required');
    }

    const existing = await this.approvalPolicyRepository.findPolicy(
      ApprovalScope.BUSINESS,
      normalizedActionKey,
      businessId,
    );
    const defaults = resolveDefaultBusinessApprovalPolicy(normalizedActionKey);
    const mode = input.mode || existing?.mode || defaults.mode;
    const businessApproverRoles = this.normalizeBusinessRoles(
      input.businessApproverRoles ||
        existing?.businessApproverRoles ||
        defaults.businessApproverRoles,
    );

    if (
      mode === ApprovalMode.SECOND_APPROVAL &&
      businessApproverRoles.length === 0
    ) {
      throw new BadRequestException(
        'businessApproverRoles is required when mode is second_approval',
      );
    }

    const policy = await this.approvalPolicyRepository.upsertPolicy(
      ApprovalScope.BUSINESS,
      normalizedActionKey,
      {
        mode,
        businessApproverRoles,
        isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
        createdBy: existing?.createdBy || (actor.sub as any),
        updatedBy: actor.sub as any,
      } as any,
      businessId,
    );

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'ApprovalPolicy',
        resourceId: policy.id,
        metadata: {
          scope: ApprovalScope.BUSINESS,
          businessId,
          actionKey: normalizedActionKey,
          mode: policy.mode,
          businessApproverRoles: policy.businessApproverRoles,
          isEnabled: policy.isEnabled,
        },
      },
      actor,
      request,
    );

    return {
      scope: ApprovalScope.BUSINESS,
      businessId,
      actionKey: policy.actionKey,
      mode: policy.mode,
      businessApproverRoles: [...(policy.businessApproverRoles || [])],
      isEnabled: policy.isEnabled,
      updatedBy: policy.updatedBy ? this.toStringId(policy.updatedBy) : null,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * List business approval requests.
   */
  async listApprovalRequests(
    actor: JwtPayload,
    businessId: string,
    input: {
      status?: AdminApprovalStatus;
      actionKey?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    approvals: BusinessApprovalResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    await this.adminApprovalRepository.expirePending();

    const page = Math.max(input.page || 1, 1);
    const limit = Math.min(Math.max(input.limit || 20, 1), 100);
    const { records, total } =
      await this.adminApprovalRepository.findManyWithFilters(
        {
          scope: ApprovalScope.BUSINESS,
          businessId,
          status: input.status,
          actionKey: input.actionKey?.trim().toLowerCase(),
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
   * Approve a business approval request as a qualified second approver.
   */
  async approveApprovalRequest(
    actor: JwtPayload,
    businessId: string,
    approvalId: string,
    note?: string,
    request?: Request,
  ): Promise<BusinessApprovalResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );
    await this.adminApprovalRepository.expirePending();

    const approval = await this.adminApprovalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (
      approval.scope !== ApprovalScope.BUSINESS ||
      this.toStringId(approval.businessId) !== businessId
    ) {
      throw new BadRequestException('Approval request business scope mismatch');
    }

    if (approval.status !== AdminApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    if (this.toStringId(approval.requestedBy) === actor.sub) {
      throw new ForbiddenException(
        'Requester cannot approve their own business request',
      );
    }

    const actorMembership =
      await this.membershipRepository.findByUserAndBusiness(
        actor.sub,
        businessId,
      );
    if (
      !actorMembership ||
      actorMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new ForbiddenException('Active business membership required');
    }

    this.assertBusinessApproverRole(
      actorMembership.role,
      approval.requiredApproverBusinessRoles || [],
    );

    const updated = await this.adminApprovalRepository.approve(
      approvalId,
      actor.sub,
      note,
    );
    if (!updated) {
      throw new BadRequestException(
        'Approval request is expired or no longer pending',
      );
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'AdminApproval',
        resourceId: updated.id,
        metadata: {
          event: 'business_approval_granted',
          businessId,
          actionKey: updated.actionKey,
          requestedBy: this.toStringId(updated.requestedBy),
        },
      },
      actor,
      request,
    );

    return this.mapApproval(updated);
  }

  /**
   * Reject a business approval request as a qualified second approver.
   */
  async rejectApprovalRequest(
    actor: JwtPayload,
    businessId: string,
    approvalId: string,
    reason: string,
    request?: Request,
  ): Promise<BusinessApprovalResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );
    await this.adminApprovalRepository.expirePending();

    const approval = await this.adminApprovalRepository.findById(approvalId);
    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (
      approval.scope !== ApprovalScope.BUSINESS ||
      this.toStringId(approval.businessId) !== businessId
    ) {
      throw new BadRequestException('Approval request business scope mismatch');
    }

    if (approval.status !== AdminApprovalStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    if (this.toStringId(approval.requestedBy) === actor.sub) {
      throw new ForbiddenException(
        'Requester cannot reject their own business request',
      );
    }

    const actorMembership =
      await this.membershipRepository.findByUserAndBusiness(
        actor.sub,
        businessId,
      );
    if (
      !actorMembership ||
      actorMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new ForbiddenException('Active business membership required');
    }

    this.assertBusinessApproverRole(
      actorMembership.role,
      approval.requiredApproverBusinessRoles || [],
    );

    const updated = await this.adminApprovalRepository.reject(
      approvalId,
      actor.sub,
      reason,
    );
    if (!updated) {
      throw new BadRequestException('Failed to reject approval request');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'AdminApproval',
        resourceId: updated.id,
        metadata: {
          event: 'business_approval_rejected',
          businessId,
          actionKey: updated.actionKey,
          reason,
          requestedBy: this.toStringId(updated.requestedBy),
        },
      },
      actor,
      request,
    );

    return this.mapApproval(updated);
  }

  /**
   * Execute a business high-risk action through policy-driven approval workflow.
   */
  async executeHighRiskAction(
    actor: JwtPayload,
    businessId: string,
    actionKey: string,
    input: {
      approvalId?: string;
      requestNote?: string;
      payload?: Record<string, unknown>;
    },
    request?: Request,
  ): Promise<
    | {
        executed: true;
        businessId: string;
        actionKey: string;
        autoApproved: boolean;
        approvalId: string | null;
      }
    | {
        executed: false;
        requiresApproval: true;
        businessId: string;
        actionKey: string;
        approvalId: string;
        expiresAt: Date;
      }
  > {
    const normalizedActionKey = normalizeApprovalActionKey(actionKey);
    const requiredPermission =
      this.resolvePermissionForActionKey(normalizedActionKey);

    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      requiredPermission,
    );

    const policy = await this.resolveBusinessActionPolicy(
      businessId,
      normalizedActionKey,
    );

    const payload = input.payload || {};

    if (policy.mode === ApprovalMode.AUTO_APPROVE || !policy.isEnabled) {
      await this.auditService.log(
        {
          action: AuditAction.BUSINESS_UPDATED,
          resource: 'BusinessAction',
          resourceId: businessId,
          metadata: {
            event: 'business_action_executed_auto',
            actionKey: normalizedActionKey,
            payload,
          },
        },
        actor,
        request,
      );

      return {
        executed: true,
        businessId,
        actionKey: normalizedActionKey,
        autoApproved: true,
        approvalId: null,
      };
    }

    if (!input.approvalId) {
      const pending = await this.adminApprovalRepository.createRequest({
        scope: ApprovalScope.BUSINESS,
        businessId,
        actionType: AdminApprovalActionType.BUSINESS_HIGH_RISK_ACTION,
        actionKey: normalizedActionKey,
        payload,
        requestedBy: actor.sub,
        requiredApproverBusinessRoles: policy.businessApproverRoles,
        requestNote: input.requestNote || null,
      });

      await this.auditService.log(
        {
          action: AuditAction.BUSINESS_UPDATED,
          resource: 'AdminApproval',
          resourceId: pending.id,
          metadata: {
            event: 'business_approval_requested',
            businessId,
            actionKey: normalizedActionKey,
          },
        },
        actor,
        request,
      );

      return {
        executed: false,
        requiresApproval: true,
        businessId,
        actionKey: normalizedActionKey,
        approvalId: pending.id,
        expiresAt: pending.expiresAt,
      };
    }

    const approved = await this.adminApprovalRepository.findById(
      input.approvalId,
    );
    if (!approved) {
      throw new NotFoundException('Approval request not found');
    }

    if (
      approved.scope !== ApprovalScope.BUSINESS ||
      this.toStringId(approved.businessId) !== businessId
    ) {
      throw new BadRequestException('Approval request business scope mismatch');
    }

    if (approved.actionKey !== normalizedActionKey) {
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

    if (!this.isApprovalPayloadMatch(approved.payload, payload)) {
      throw new BadRequestException(
        'Approval request payload does not match execution payload',
      );
    }

    await this.adminApprovalRepository.markExecuted(approved.id);

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'BusinessAction',
        resourceId: businessId,
        metadata: {
          event: 'business_action_executed_post_approval',
          actionKey: normalizedActionKey,
          approvalId: approved.id,
          payload,
        },
      },
      actor,
      request,
    );

    return {
      executed: true,
      businessId,
      actionKey: normalizedActionKey,
      autoApproved: false,
      approvalId: approved.id,
    };
  }

  /**
   * List role templates for a business.
   */
  async listRoleTemplates(
    actor: JwtPayload,
    businessId: string,
    includeInactive = false,
  ): Promise<{ businessId: string; templates: RoleTemplateResponse[] }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    const templates = await this.roleTemplateRepository.findByBusinessId(
      businessId,
      includeInactive,
    );

    return {
      businessId,
      templates: templates.map((template) => this.mapRoleTemplate(template)),
    };
  }

  /**
   * Create a reusable role template for business memberships.
   */
  async createRoleTemplate(
    actor: JwtPayload,
    businessId: string,
    input: {
      name: string;
      description?: string;
      baseRole: BusinessRole;
      extraPermissions?: Permission[];
      deniedPermissions?: Permission[];
    },
    request?: Request,
  ): Promise<RoleTemplateResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const normalizedName = input.name.trim();
    const existing = await this.roleTemplateRepository.findByBusinessAndName(
      businessId,
      normalizedName,
    );

    if (existing) {
      throw new ConflictException(
        'A role template with this name already exists for this business',
      );
    }

    const created = await this.roleTemplateRepository.create({
      businessId: businessId as any,
      name: normalizedName,
      description: input.description?.trim() || null,
      baseRole: input.baseRole,
      extraPermissions: input.extraPermissions || [],
      deniedPermissions: input.deniedPermissions || [],
      isActive: true,
      createdBy: actor.sub as any,
      updatedBy: null,
    } as any);

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'BusinessRoleTemplate',
        resourceId: created.id,
        metadata: {
          businessId,
          templateName: created.name,
          baseRole: created.baseRole,
        },
      },
      actor,
      request,
    );

    return this.mapRoleTemplate(created);
  }

  /**
   * Update an existing role template.
   */
  async updateRoleTemplate(
    actor: JwtPayload,
    businessId: string,
    templateId: string,
    input: {
      name?: string;
      description?: string;
      baseRole?: BusinessRole;
      extraPermissions?: Permission[];
      deniedPermissions?: Permission[];
      isActive?: boolean;
    },
    request?: Request,
  ): Promise<RoleTemplateResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    const existing = await this.roleTemplateRepository.findByIdAndBusinessId(
      templateId,
      businessId,
    );
    if (!existing) {
      throw new NotFoundException('Role template not found');
    }

    if (input.name && input.name.trim() !== existing.name) {
      const duplicate = await this.roleTemplateRepository.findByBusinessAndName(
        businessId,
        input.name.trim(),
      );
      if (duplicate && duplicate.id !== existing.id) {
        throw new ConflictException(
          'A role template with this name already exists for this business',
        );
      }
    }

    const updated = await this.roleTemplateRepository.updateByIdAndBusinessId(
      templateId,
      businessId,
      {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() || null }
          : {}),
        ...(input.baseRole !== undefined ? { baseRole: input.baseRole } : {}),
        ...(input.extraPermissions !== undefined
          ? { extraPermissions: input.extraPermissions }
          : {}),
        ...(input.deniedPermissions !== undefined
          ? { deniedPermissions: input.deniedPermissions }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedBy: actor.sub as any,
      } as any,
    );

    if (!updated) {
      throw new NotFoundException('Role template not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'BusinessRoleTemplate',
        resourceId: updated.id,
        metadata: {
          businessId,
          templateName: updated.name,
          baseRole: updated.baseRole,
          isActive: updated.isActive,
        },
      },
      actor,
      request,
    );

    return this.mapRoleTemplate(updated);
  }

  /**
   * Delete a role template.
   */
  async deleteRoleTemplate(
    actor: JwtPayload,
    businessId: string,
    templateId: string,
    request?: Request,
  ): Promise<{ message: string }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    const existing = await this.roleTemplateRepository.findByIdAndBusinessId(
      templateId,
      businessId,
    );
    if (!existing) {
      throw new NotFoundException('Role template not found');
    }

    const deleted = await this.roleTemplateRepository.deleteByIdAndBusinessId(
      templateId,
      businessId,
    );
    if (!deleted) {
      throw new NotFoundException('Role template not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'BusinessRoleTemplate',
        resourceId: templateId,
        metadata: {
          businessId,
          event: 'template_deleted',
          templateName: existing.name,
        },
      },
      actor,
      request,
    );

    return { message: 'Role template deleted' };
  }

  /**
   * Apply a role template to a business member.
   */
  async applyRoleTemplateToMember(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    templateId: string,
    request?: Request,
  ): Promise<{
    businessId: string;
    userId: string;
    templateId: string;
    role: string;
    extraPermissions: string[];
    deniedPermissions: string[];
  }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_UPDATE,
    );

    if (actor.sub === userId) {
      throw new BadRequestException(
        'You cannot apply a role template to your own membership',
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
      throw new ForbiddenException('Owner role cannot be reassigned');
    }

    const template = await this.roleTemplateRepository.findByIdAndBusinessId(
      templateId,
      businessId,
    );
    if (!template || !template.isActive) {
      throw new NotFoundException('Active role template not found');
    }

    const [updatedRole, updatedPermissions] = await Promise.all([
      this.membershipRepository.updateRole(
        userId,
        businessId,
        template.baseRole,
      ),
      this.membershipRepository.updatePermissions(
        userId,
        businessId,
        [...(template.extraPermissions || [])],
        [...(template.deniedPermissions || [])],
      ),
    ]);

    if (!updatedRole || !updatedPermissions) {
      throw new NotFoundException('Business membership not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_ROLE_CHANGED,
        resource: 'BusinessMembership',
        resourceId: updatedRole.id,
        metadata: {
          businessId,
          userId,
          templateId,
          templateName: template.name,
          previousRole: membership.role,
          newRole: updatedRole.role,
          extraPermissions: template.extraPermissions,
          deniedPermissions: template.deniedPermissions,
        },
      },
      actor,
      request,
    );

    return {
      businessId,
      userId,
      templateId,
      role: updatedRole.role,
      extraPermissions: [...(updatedPermissions.extraPermissions || [])],
      deniedPermissions: [...(updatedPermissions.deniedPermissions || [])],
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
   * Resend an invitation OTP for a pending business invite.
   */
  async resendInvite(
    actor: JwtPayload,
    businessId: string,
    userId: string,
    request?: Request,
  ): Promise<{ message: string; businessId: string; userId: string }> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_INVITE,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );
    if (!membership) {
      throw new NotFoundException('Business membership not found');
    }
    if (membership.status !== MembershipStatus.INVITED) {
      throw new BadRequestException('Only invited memberships can be resent');
    }

    const [business, user] = await Promise.all([
      this.businessRepository.findById(businessId),
      this.userRepository.findById(userId),
    ]);

    if (!business) {
      throw new NotFoundException('Business not found');
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:4200',
    );
    const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;

    await this.authService.sendInviteOtp(
      user.email,
      {
        firstName: user.displayName.split(' ')[0] || user.displayName,
        inviterName: actor.displayName,
        businessName: business.name,
        loginUrl,
      },
      request,
    );

    await this.membershipRepository.upsertInvitation(
      userId,
      businessId,
      membership.role,
      actor.sub,
    );

    await this.auditService.log(
      {
        action: AuditAction.MEMBER_INVITED,
        resource: 'BusinessMembership',
        resourceId: membership.id,
        metadata: {
          businessId,
          userId,
          event: 'invite_resent',
        },
      },
      actor,
      request,
    );

    return {
      message: 'Invitation resent',
      businessId,
      userId,
    };
  }

  /**
   * Cancel a pending invite.
   */
  async cancelInvite(
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
      Permission.MEMBER_INVITE,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership) {
      throw new NotFoundException('Business membership not found');
    }
    if (membership.status !== MembershipStatus.INVITED) {
      throw new BadRequestException(
        'Only invited memberships can be cancelled',
      );
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
          userId,
          event: 'invite_cancelled',
        },
      },
      actor,
      request,
    );

    return {
      message: 'Invitation cancelled',
      businessId,
      userId,
      status: updated.status,
    };
  }

  /**
   * Expire a pending invite.
   */
  async expireInvite(
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
      Permission.MEMBER_INVITE,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );

    if (!membership) {
      throw new NotFoundException('Business membership not found');
    }
    if (membership.status !== MembershipStatus.INVITED) {
      throw new BadRequestException('Only invited memberships can be expired');
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
          userId,
          event: 'invite_expired',
        },
      },
      actor,
      request,
    );

    return {
      message: 'Invitation expired',
      businessId,
      userId,
      status: updated.status,
    };
  }

  /**
   * Get invite status and timeline for a member invite.
   */
  async getInviteHistory(
    actor: JwtPayload,
    businessId: string,
    userId: string,
  ): Promise<InviteHistoryResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    const membership = await this.membershipRepository.findByUserAndBusiness(
      userId,
      businessId,
    );
    if (!membership) {
      throw new NotFoundException('Business membership not found');
    }

    const audit = await this.auditService.findLogs(
      {
        resource: 'BusinessMembership',
        resourceId: membership.id,
      },
      1,
      50,
    );

    const events: InviteHistoryEvent[] = audit.logs.map((entry) => {
      const record =
        entry && typeof entry === 'object'
          ? (entry as Record<string, unknown>)
          : {};

      const createdAtRaw = record.createdAt;
      const createdAt =
        createdAtRaw instanceof Date
          ? createdAtRaw
          : new Date(String(createdAtRaw ?? Date.now()));

      return {
        action:
          typeof record.action === 'string' ? record.action : 'unknown_action',
        success: record.success !== false,
        createdAt,
        metadata:
          record.metadata && typeof record.metadata === 'object'
            ? (record.metadata as Record<string, unknown>)
            : null,
      };
    });

    return {
      membershipId: membership.id,
      businessId,
      userId,
      status: membership.status,
      role: membership.role,
      invitedAt: membership.invitedAt ?? null,
      joinedAt: membership.joinedAt ?? null,
      events,
    };
  }

  /**
   * Get current ownership transfer state for a business.
   */
  async getOwnershipTransferStatus(
    actor: JwtPayload,
    businessId: string,
  ): Promise<OwnershipTransferStatusResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.MEMBER_READ,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const transfer = (business as any).ownershipTransfer || {
      status: 'none',
      proposedOwnerId: null,
      initiatedBy: null,
      initiatedAt: null,
      acceptedAt: null,
    };

    return {
      businessId,
      status: transfer.status || 'none',
      currentOwnerId: this.toStringId(business.ownerId),
      proposedOwnerId: transfer.proposedOwnerId
        ? this.toStringId(transfer.proposedOwnerId)
        : null,
      initiatedBy: transfer.initiatedBy
        ? this.toStringId(transfer.initiatedBy)
        : null,
      initiatedAt: transfer.initiatedAt ?? null,
      acceptedAt: transfer.acceptedAt ?? null,
    };
  }

  /**
   * Initiate ownership transfer from current owner to another active member.
   */
  async initiateOwnershipTransfer(
    actor: JwtPayload,
    businessId: string,
    dto: TransferOwnershipDto,
    request?: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.BUSINESS_UPDATE,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const currentOwnerId = this.toStringId(business.ownerId);
    if (currentOwnerId !== actor.sub) {
      throw new ForbiddenException(
        'Only the current owner can transfer ownership',
      );
    }

    if (dto.newOwnerUserId === currentOwnerId) {
      throw new BadRequestException(
        'Target owner is already the current owner',
      );
    }

    const transfer = (business as any).ownershipTransfer;
    if (transfer?.status === 'pending') {
      throw new ConflictException('An ownership transfer is already pending');
    }

    const [targetUser, targetMembership] = await Promise.all([
      this.userRepository.findById(dto.newOwnerUserId),
      this.membershipRepository.findByUserAndBusiness(
        dto.newOwnerUserId,
        businessId,
      ),
    ]);

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }
    if (targetUser.isSystemUser) {
      throw new BadRequestException('System users cannot own businesses');
    }
    if (
      !targetMembership ||
      targetMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Target user must be an active member of this business',
      );
    }

    await this.businessRepository.updateById(businessId, {
      ownershipTransfer: {
        status: 'pending',
        proposedOwnerId: dto.newOwnerUserId as any,
        initiatedBy: actor.sub as any,
        initiatedAt: new Date(),
        acceptedAt: null,
      },
    } as any);

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'Business',
        resourceId: businessId,
        metadata: {
          event: 'ownership_transfer_initiated',
          currentOwnerId,
          newOwnerUserId: dto.newOwnerUserId,
          note: dto.note || null,
        },
      },
      actor,
      request,
    );

    return this.getOwnershipTransferStatus(actor, businessId);
  }

  /**
   * Accept ownership transfer as the proposed new owner.
   */
  async acceptOwnershipTransfer(
    actor: JwtPayload,
    businessId: string,
    request?: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    await this.assertBusinessScopedAccess(actor, businessId);

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const transfer = (business as any).ownershipTransfer;
    if (!transfer || transfer.status !== 'pending') {
      throw new BadRequestException('No pending ownership transfer found');
    }

    const proposedOwnerId = this.toStringId(transfer.proposedOwnerId);
    if (proposedOwnerId !== actor.sub) {
      throw new ForbiddenException(
        'Only the proposed owner can accept transfer',
      );
    }

    await this.businessRepository.updateById(businessId, {
      ownershipTransfer: {
        ...transfer,
        status: 'accepted',
        acceptedAt: new Date(),
      },
    } as any);

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'Business',
        resourceId: businessId,
        metadata: {
          event: 'ownership_transfer_accepted',
          proposedOwnerId,
        },
      },
      actor,
      request,
    );

    return this.getOwnershipTransferStatus(actor, businessId);
  }

  /**
   * Confirm an accepted ownership transfer and finalize ownership change.
   */
  async confirmOwnershipTransfer(
    actor: JwtPayload,
    businessId: string,
    request?: Request,
  ): Promise<OwnershipTransferStatusResponse> {
    await this.assertBusinessScopedAccess(
      actor,
      businessId,
      Permission.BUSINESS_UPDATE,
    );

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const transfer = (business as any).ownershipTransfer;
    if (!transfer || transfer.status !== 'accepted') {
      throw new BadRequestException(
        'Ownership transfer must be accepted before confirmation',
      );
    }

    const initiatedBy = this.toStringId(transfer.initiatedBy);
    if (initiatedBy !== actor.sub) {
      throw new ForbiddenException(
        'Only the initiating owner can confirm transfer',
      );
    }

    const oldOwnerId = this.toStringId(business.ownerId);
    const newOwnerId = this.toStringId(transfer.proposedOwnerId);

    const targetMembership =
      await this.membershipRepository.findByUserAndBusiness(
        newOwnerId,
        businessId,
      );
    if (
      !targetMembership ||
      targetMembership.status !== MembershipStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Proposed owner must remain an active business member',
      );
    }

    await this.businessRepository.updateById(businessId, {
      ownerId: newOwnerId as any,
      ownershipTransfer: {
        status: 'none',
        proposedOwnerId: null,
        initiatedBy: null,
        initiatedAt: null,
        acceptedAt: null,
      },
    } as any);

    await Promise.all([
      this.membershipRepository.updateRole(
        oldOwnerId,
        businessId,
        BusinessRole.BUSINESS_AGENT,
      ),
      this.membershipRepository.updateRole(
        newOwnerId,
        businessId,
        BusinessRole.BUSINESS_OWNER,
      ),
    ]);

    await this.auditService.log(
      {
        action: AuditAction.BUSINESS_UPDATED,
        resource: 'Business',
        resourceId: businessId,
        metadata: {
          event: 'ownership_transfer_confirmed',
          oldOwnerId,
          newOwnerId,
        },
      },
      actor,
      request,
    );

    return this.getOwnershipTransferStatus(actor, businessId);
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

  private mapApproval(approval: {
    id: string;
    scope: ApprovalScope;
    businessId?: unknown;
    actionType: AdminApprovalActionType;
    actionKey: string;
    status: AdminApprovalStatus;
    requestedBy: unknown;
    approvedBy?: unknown;
    rejectedBy?: unknown;
    requestNote?: string | null;
    approvalNote?: string | null;
    rejectionReason?: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    payload?: Record<string, unknown>;
  }): BusinessApprovalResponse {
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
      requestNote: approval.requestNote || null,
      approvalNote: approval.approvalNote || null,
      rejectionReason: approval.rejectionReason || null,
      expiresAt: approval.expiresAt,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
      payload: approval.payload || {},
    };
  }

  private resolvePermissionForActionKey(actionKey: string): Permission {
    const normalized = normalizeApprovalActionKey(actionKey);

    if (normalized.startsWith('finance:')) {
      if (normalized === 'finance:export') {
        return Permission.FINANCE_EXPORT;
      }
      return Permission.FINANCE_MANAGE;
    }

    if (normalized.startsWith('member:')) {
      return Permission.MEMBER_UPDATE;
    }

    if (normalized.startsWith('kyc:')) {
      return Permission.KYC_SUBMIT;
    }

    return Permission.BUSINESS_UPDATE;
  }

  private async resolveBusinessActionPolicy(
    businessId: string,
    actionKey: string,
  ): Promise<{
    mode: ApprovalMode;
    businessApproverRoles: BusinessRole[];
    isEnabled: boolean;
  }> {
    const existing = await this.approvalPolicyRepository.findPolicy(
      ApprovalScope.BUSINESS,
      actionKey,
      businessId,
    );

    if (existing) {
      return {
        mode: existing.mode,
        businessApproverRoles: [...(existing.businessApproverRoles || [])],
        isEnabled: existing.isEnabled,
      };
    }

    const defaults = resolveDefaultBusinessApprovalPolicy(actionKey);
    return {
      mode: defaults.mode,
      businessApproverRoles: defaults.businessApproverRoles,
      isEnabled: true,
    };
  }

  private normalizeBusinessRoles(roles: BusinessRole[]): BusinessRole[] {
    return Array.from(new Set(roles));
  }

  private assertBusinessApproverRole(
    actorRole: BusinessRole,
    requiredRoles: BusinessRole[],
  ): void {
    if (!requiredRoles || requiredRoles.length === 0) {
      return;
    }

    if (!requiredRoles.includes(actorRole)) {
      throw new ForbiddenException(
        `Approver role not permitted. Allowed roles: ${requiredRoles.join(', ')}`,
      );
    }
  }

  private isApprovalPayloadMatch(
    existingPayload: Record<string, unknown>,
    requestedPayload: Record<string, unknown>,
  ): boolean {
    const existingKeys = Object.keys(existingPayload || {}).sort();
    const requestedKeys = Object.keys(requestedPayload || {}).sort();

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

  private mapRoleTemplate(template: {
    id: string;
    businessId: unknown;
    name: string;
    description: string | null;
    baseRole: string;
    extraPermissions?: string[];
    deniedPermissions?: string[];
    isActive: boolean;
    createdBy: unknown;
    updatedBy?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): RoleTemplateResponse {
    return {
      id: template.id,
      businessId: this.toStringId(template.businessId),
      name: template.name,
      description: template.description ?? null,
      baseRole: template.baseRole,
      extraPermissions: [...(template.extraPermissions || [])],
      deniedPermissions: [...(template.deniedPermissions || [])],
      isActive: template.isActive,
      createdBy: this.toStringId(template.createdBy),
      updatedBy: template.updatedBy
        ? this.toStringId(template.updatedBy)
        : null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
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
