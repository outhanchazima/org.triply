// libs/database/src/lib/repositories/approval-policy.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ApprovalPolicy,
  ApprovalPolicyDocument,
  ApprovalPolicySchema,
  ApprovalScope,
} from '../schemas/approval-policy.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class ApprovalPolicyRepository extends BaseMongoRepository<ApprovalPolicyDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', ApprovalPolicy.name, ApprovalPolicySchema);
  }

  /**
   * List policies by scope and optional business.
   */
  async listByScope(
    scope: ApprovalScope,
    businessId?: string | Types.ObjectId | null,
  ): Promise<ApprovalPolicyDocument[]> {
    const query: Record<string, unknown> = { scope };

    if (scope === ApprovalScope.BUSINESS) {
      query.businessId = businessId
        ? new Types.ObjectId(String(businessId))
        : null;
    } else {
      query.businessId = null;
    }

    return this.model.find(query).sort({ actionKey: 1 }).exec();
  }

  /**
   * Find one policy by scope/action and optional business.
   */
  async findPolicy(
    scope: ApprovalScope,
    actionKey: string,
    businessId?: string | Types.ObjectId | null,
  ): Promise<ApprovalPolicyDocument | null> {
    const query: Record<string, unknown> = {
      scope,
      actionKey: actionKey.trim().toLowerCase(),
    };

    if (scope === ApprovalScope.BUSINESS) {
      query.businessId = businessId
        ? new Types.ObjectId(String(businessId))
        : null;
    } else {
      query.businessId = null;
    }

    return this.model.findOne(query).exec();
  }

  /**
   * Upsert policy by scope/action and optional business.
   */
  async upsertPolicy(
    scope: ApprovalScope,
    actionKey: string,
    data: Partial<ApprovalPolicy>,
    businessId?: string | Types.ObjectId | null,
  ): Promise<ApprovalPolicyDocument> {
    const query: Record<string, unknown> = {
      scope,
      actionKey: actionKey.trim().toLowerCase(),
    };

    if (scope === ApprovalScope.BUSINESS) {
      query.businessId = businessId
        ? new Types.ObjectId(String(businessId))
        : null;
    } else {
      query.businessId = null;
    }

    const record = await this.model
      .findOneAndUpdate(
        query,
        {
          ...data,
          scope,
          actionKey: actionKey.trim().toLowerCase(),
          businessId:
            scope === ApprovalScope.BUSINESS
              ? businessId
                ? new Types.ObjectId(String(businessId))
                : null
              : null,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    if (!record) {
      throw new Error('Failed to upsert approval policy');
    }

    return record;
  }
}

export { ApprovalScope };
