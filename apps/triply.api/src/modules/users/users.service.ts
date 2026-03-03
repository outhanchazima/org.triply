// apps/triply.api/src/modules/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AuditAction,
  BusinessMembershipRepository,
  UserRepository,
} from '@org.triply/database';
import { AuditService } from '@org.triply/shared';
import type { JwtPayload } from '@org.triply/shared';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';

export interface UserProfileResponse {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  isTraveller: boolean;
  isSystemUser: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMembershipResponse {
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  role: string;
  status: string;
  joinedAt: Date | null;
  invitedAt: Date | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Fetch profile for currently authenticated user.
   */
  async getMe(userId: string): Promise<{
    user: UserProfileResponse;
    memberships: UserMembershipResponse[];
  }> {
    const user = await this.getUser(userId);
    const memberships = await this.getUserMemberships(userId);

    return {
      user,
      memberships,
    };
  }

  /**
   * Get a user profile by ID.
   */
  async getUser(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      isTraveller: user.isTraveller,
      isSystemUser: user.isSystemUser,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update editable user profile fields.
   */
  async updateUser(
    actor: JwtPayload,
    userId: string,
    dto: UpdateUserProfileDto,
    request?: Request,
  ): Promise<UserProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: {
      displayName?: string;
      avatarUrl?: string | null;
      phone?: string | null;
    } = {};

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName.trim();
    }

    if (dto.avatarUrl !== undefined) {
      updateData.avatarUrl = dto.avatarUrl;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const updated = await this.userRepository.updateById(userId, updateData);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    await this.auditService.log(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'User',
        resourceId: userId,
        before: {
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
        },
        after: {
          displayName: updated.displayName,
          avatarUrl: updated.avatarUrl,
          phone: updated.phone,
        },
      },
      actor,
      request,
    );

    return this.getUser(userId);
  }

  /**
   * List users with optional filters and pagination.
   */
  async listUsers(query: UsersQueryDto): Promise<{
    users: UserProfileResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);

    const { users, total } = await this.userRepository.findUsers(
      {
        email: query.email,
        isTraveller: query.isTraveller,
        isSystemUser: query.isSystemUser,
        isActive: query.isActive,
      },
      page,
      limit,
    );

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isTraveller: user.isTraveller,
        isSystemUser: user.isSystemUser,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * List memberships for a user.
   */
  async getUserMemberships(userId: string): Promise<UserMembershipResponse[]> {
    const memberships = await this.membershipRepository.findByUserId(userId);

    return memberships.map((membership) => {
      const business = this.extractBusinessRef(membership.businessId);

      return {
        businessId: business.businessId,
        businessName: business.businessName,
        businessLogoUrl: business.businessLogoUrl,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt ?? null,
        invitedAt: membership.invitedAt ?? null,
      };
    });
  }

  /**
   * Deactivate a user account.
   */
  async deactivateUser(
    actor: JwtPayload,
    userId: string,
    request?: Request,
  ): Promise<{ id: string; isActive: boolean; message: string }> {
    if (actor.sub === userId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      return {
        id: user.id,
        isActive: false,
        message: 'User is already deactivated',
      };
    }

    await this.userRepository.deactivateUser(userId);

    await this.auditService.log(
      {
        action: AuditAction.USER_DELETED,
        resource: 'User',
        resourceId: userId,
        metadata: {
          reason: 'deactivated_by_admin',
        },
      },
      actor,
      request,
    );

    return {
      id: userId,
      isActive: false,
      message: 'User deactivated successfully',
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
