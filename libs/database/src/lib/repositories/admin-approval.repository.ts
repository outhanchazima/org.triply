// libs/database/src/lib/repositories/admin-approval.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AdminApproval,
  AdminApprovalActionType,
  AdminApprovalDocument,
  AdminApprovalSchema,
  AdminApprovalStatus,
} from '../schemas/admin-approval.schema';
import { ApprovalScope } from '../schemas/approval-policy.schema';
import { BusinessRole, SystemRole } from '../schemas/enums';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class AdminApprovalRepository extends BaseMongoRepository<AdminApprovalDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', AdminApproval.name, AdminApprovalSchema);
  }

  /**
   * Create a pending approval request.
   */
  async createRequest(input: {
    actionType: AdminApprovalActionType;
    actionKey: string;
    payload: Record<string, unknown>;
    requestedBy: string | Types.ObjectId;
    scope?: ApprovalScope;
    businessId?: string | Types.ObjectId | null;
    requiredApproverBusinessRoles?: BusinessRole[];
    requiredApproverSystemRoles?: SystemRole[];
    requestNote?: string | null;
    expiresAt?: Date;
  }): Promise<AdminApprovalDocument> {
    const expiresAt =
      input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

    return this.model.create({
      scope: input.scope || ApprovalScope.SYSTEM,
      businessId: input.businessId
        ? new Types.ObjectId(String(input.businessId))
        : null,
      actionType: input.actionType,
      actionKey: input.actionKey.trim().toLowerCase(),
      payload: input.payload,
      requestedBy: input.requestedBy,
      requiredApproverBusinessRoles: input.requiredApproverBusinessRoles || [],
      requiredApproverSystemRoles: input.requiredApproverSystemRoles || [],
      requestNote: input.requestNote || null,
      status: AdminApprovalStatus.PENDING,
      expiresAt,
    });
  }

  /**
   * Find an approval request by ID.
   */
  async findById(
    id: string | Types.ObjectId,
  ): Promise<AdminApprovalDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * List approval requests.
   */
  async findManyWithFilters(
    filters: {
      status?: AdminApprovalStatus;
      actionType?: AdminApprovalActionType;
      actionKey?: string;
      scope?: ApprovalScope;
      businessId?: string;
      requestedBy?: string;
    },
    page = 1,
    limit = 20,
  ): Promise<{ records: AdminApprovalDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.actionType) {
      query.actionType = filters.actionType;
    }

    if (filters.actionKey) {
      query.actionKey = filters.actionKey.trim().toLowerCase();
    }

    if (filters.scope) {
      query.scope = filters.scope;
    }

    if (filters.businessId) {
      query.businessId = new Types.ObjectId(filters.businessId);
    }

    if (filters.requestedBy) {
      query.requestedBy = new Types.ObjectId(filters.requestedBy);
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query),
    ]);

    return { records, total };
  }

  /**
   * Approve a pending request.
   */
  async approve(
    id: string | Types.ObjectId,
    approvedBy: string | Types.ObjectId,
    approvalNote?: string,
  ): Promise<AdminApprovalDocument | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: AdminApprovalStatus.PENDING,
          expiresAt: { $gt: new Date() },
        },
        {
          status: AdminApprovalStatus.APPROVED,
          approvedBy,
          approvalNote: approvalNote || null,
          approvedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Reject a pending request.
   */
  async reject(
    id: string | Types.ObjectId,
    rejectedBy: string | Types.ObjectId,
    rejectionReason: string,
  ): Promise<AdminApprovalDocument | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: AdminApprovalStatus.PENDING,
        },
        {
          status: AdminApprovalStatus.REJECTED,
          rejectedBy,
          rejectionReason,
          rejectedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Mark an approved request as executed.
   */
  async markExecuted(
    id: string | Types.ObjectId,
  ): Promise<AdminApprovalDocument | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: AdminApprovalStatus.APPROVED,
        },
        {
          status: AdminApprovalStatus.EXECUTED,
          executedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Expire stale pending requests.
   */
  async expirePending(): Promise<number> {
    const result = await this.model
      .updateMany(
        {
          status: AdminApprovalStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { status: AdminApprovalStatus.EXPIRED },
      )
      .exec();

    return result.modifiedCount;
  }

  /**
   * Find approval requests scoped to a business.
   */
  async findByBusinessScope(
    businessId: string | Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{ records: AdminApprovalDocument[]; total: number }> {
    const query = {
      scope: ApprovalScope.BUSINESS,
      businessId: new Types.ObjectId(String(businessId)),
    };
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query),
    ]);

    return { records, total };
  }
}

export { AdminApprovalActionType, AdminApprovalStatus };
