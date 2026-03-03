// libs/database/src/lib/repositories/system-user-access-policy.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  SystemUserAccessPolicy,
  SystemUserAccessPolicyDocument,
  SystemUserAccessPolicySchema,
} from '../schemas/system-user-access-policy.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class SystemUserAccessPolicyRepository extends BaseMongoRepository<SystemUserAccessPolicyDocument> {
  constructor(mongoService: MongoService) {
    super(
      mongoService,
      'main',
      SystemUserAccessPolicy.name,
      SystemUserAccessPolicySchema,
    );
  }

  /**
   * Find access policy for a system user.
   */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<SystemUserAccessPolicyDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Upsert access policy for a system user.
   */
  async upsertByUserId(
    userId: string | Types.ObjectId,
    data: Partial<SystemUserAccessPolicy>,
  ): Promise<SystemUserAccessPolicyDocument> {
    const record = await this.model
      .findOneAndUpdate({ userId }, data, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      })
      .exec();

    if (!record) {
      throw new Error('Failed to upsert system user access policy');
    }

    return record;
  }
}
