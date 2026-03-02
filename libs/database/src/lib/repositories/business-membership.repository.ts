// libs/database/src/lib/repositories/business-membership.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  BusinessMembership,
  BusinessMembershipDocument,
  BusinessMembershipSchema,
} from '../schemas/business-membership.schema';
import { BusinessRole, MembershipStatus } from '../schemas/enums';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class BusinessMembershipRepository extends BaseMongoRepository<BusinessMembershipDocument> {
  constructor(mongoService: MongoService) {
    super(
      mongoService,
      'main',
      BusinessMembership.name,
      BusinessMembershipSchema,
    );
  }

  /**
   * Find membership by user and business
   * @param userId User ID
   * @param businessId Business ID
   * @returns Business membership document or null
   */
  async findByUserAndBusiness(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument | null> {
    return this.model.findOne({ userId, businessId }).exec();
  }

  /**
   * Find all memberships for a user
   * @param userId User ID
   * @returns Array of membership documents
   */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument[]> {
    return this.model
      .find({ userId })
      .populate('businessId', 'name logoUrl')
      .exec();
  }

  /**
   * Find active memberships for a user
   * @param userId User ID
   * @returns Array of active membership documents
   */
  async findActiveByUserId(
    userId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument[]> {
    return this.model
      .find({ userId, status: MembershipStatus.ACTIVE })
      .populate('businessId', 'name logoUrl')
      .exec();
  }

  /**
   * Find all members of a business
   * @param businessId Business ID
   * @returns Array of membership documents
   */
  async findByBusinessId(
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument[]> {
    return this.model
      .find({ businessId })
      .populate('userId', 'email displayName avatarUrl')
      .exec();
  }

  /**
   * Find active members of a business
   * @param businessId Business ID
   * @returns Array of active membership documents
   */
  async findActiveByBusinessId(
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument[]> {
    return this.model
      .find({ businessId, status: MembershipStatus.ACTIVE })
      .populate('userId', 'email displayName avatarUrl')
      .exec();
  }

  /**
   * Update membership role
   * @param userId User ID
   * @param businessId Business ID
   * @param role New business role
   * @returns Updated membership document or null
   */
  async updateRole(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
    role: BusinessRole,
  ): Promise<BusinessMembershipDocument | null> {
    return this.model
      .findOneAndUpdate({ userId, businessId }, { role }, { new: true })
      .exec();
  }

  /**
   * Update member permissions
   * @param userId User ID
   * @param businessId Business ID
   * @param extraPermissions Additional permissions granted
   * @param deniedPermissions Permissions specifically denied
   * @returns Updated membership document or null
   */
  async updatePermissions(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
    extraPermissions: string[],
    deniedPermissions: string[],
  ): Promise<BusinessMembershipDocument | null> {
    return this.model
      .findOneAndUpdate(
        { userId, businessId },
        { extraPermissions, deniedPermissions },
        { new: true },
      )
      .exec();
  }

  /**
   * Activate a membership (invite acceptance)
   * @param userId User ID
   * @param businessId Business ID
   * @returns Updated membership document or null
   */
  async activateMembership(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument | null> {
    return this.model
      .findOneAndUpdate(
        { userId, businessId },
        { status: MembershipStatus.ACTIVE, joinedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  /**
   * Create or update an invitation membership.
   * If membership exists and is already active, it is returned unchanged.
   * @param userId User ID
   * @param businessId Business ID
   * @param role Invited role
   * @param invitedBy Inviter user ID
   * @returns Upserted membership
   */
  async upsertInvitation(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
    role: BusinessRole,
    invitedBy: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument> {
    const existing = await this.findByUserAndBusiness(userId, businessId);
    if (existing && existing.status === MembershipStatus.ACTIVE) {
      return existing;
    }

    const membership = await this.model
      .findOneAndUpdate(
        { userId, businessId },
        {
          role,
          status: MembershipStatus.INVITED,
          invitedBy,
          invitedAt: new Date(),
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    if (!membership) {
      throw new Error('Failed to create membership invitation');
    }

    return membership;
  }

  /**
   * Mark member as left (soft delete)
   * @param userId User ID
   * @param businessId Business ID
   * @returns Updated membership document or null
   */
  async removeMember(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument | null> {
    return this.model
      .findOneAndUpdate(
        { userId, businessId },
        { status: MembershipStatus.LEFT },
        { new: true },
      )
      .exec();
  }

  /**
   * Suspend a member
   * @param userId User ID
   * @param businessId Business ID
   * @returns Updated membership document or null
   */
  async suspendMember(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<BusinessMembershipDocument | null> {
    return this.model
      .findOneAndUpdate(
        { userId, businessId },
        { status: MembershipStatus.SUSPENDED },
        { new: true },
      )
      .exec();
  }

  /**
   * Check if user has active membership in business
   * @param userId User ID
   * @param businessId Business ID
   * @returns True if has active membership
   */
  async hasActiveMembership(
    userId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<boolean> {
    const count = await this.model.countDocuments({
      userId,
      businessId,
      status: MembershipStatus.ACTIVE,
    });
    return count > 0;
  }

  /**
   * Count members in a business
   * @param businessId Business ID
   * @returns Count of members
   */
  async countByBusinessId(
    businessId: string | Types.ObjectId,
  ): Promise<number> {
    return this.model.countDocuments({ businessId });
  }

  /**
   * Delete all memberships for a business (cleanup on deletion)
   * @param businessId Business ID
   */
  async deleteByBusinessId(businessId: string | Types.ObjectId): Promise<void> {
    await this.model.deleteMany({ businessId });
  }
}
