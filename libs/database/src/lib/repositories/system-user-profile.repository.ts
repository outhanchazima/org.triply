// libs/database/src/lib/repositories/system-user-profile.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  SystemUserProfile,
  SystemUserProfileDocument,
  SystemUserProfileSchema,
} from '../schemas/system-user-profile.schema';
import { SystemRole } from '../schemas/enums';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class SystemUserProfileRepository extends BaseMongoRepository<SystemUserProfileDocument> {
  constructor(mongoService: MongoService) {
    super(
      mongoService,
      'main',
      SystemUserProfile.name,
      SystemUserProfileSchema,
    );
  }

  /**
   * Find system user profile by user ID
   * @param userId User ID to search for
   * @returns System user profile document or null
   */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<SystemUserProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Find all system user profiles by role
   * @param role System role to filter by
   * @returns Array of system user profile documents
   */
  async findByRole(role: SystemRole): Promise<SystemUserProfileDocument[]> {
    return this.model
      .find({ role })
      .populate('userId', 'email displayName isActive')
      .exec();
  }

  /**
   * Find all system user profiles
   * @returns Array of all system user profile documents
   */
  async findAll(): Promise<SystemUserProfileDocument[]> {
    return this.model
      .find()
      .populate('userId', 'email displayName isActive')
      .exec();
  }

  /**
   * Update system user profile by user ID
   * @param userId User ID
   * @param data Partial profile data to update
   * @returns Updated profile document or null
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    data: Partial<SystemUserProfile>,
  ): Promise<SystemUserProfileDocument | null> {
    return this.model.findOneAndUpdate({ userId }, data, { new: true }).exec();
  }

  /**
   * Check if system user profile exists for user
   * @param userId User ID
   * @returns True if profile exists
   */
  async existsByUserId(userId: string | Types.ObjectId): Promise<boolean> {
    const count = await this.model.countDocuments({ userId });
    return count > 0;
  }

  /**
   * Delete system user profile by user ID
   * @param userId User ID
   */
  async deleteByUserId(userId: string | Types.ObjectId): Promise<void> {
    await this.model.deleteOne({ userId });
  }
}
