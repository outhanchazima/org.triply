// libs/database/src/lib/repositories/traveller-profile.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  TravellerProfile,
  TravellerProfileDocument,
  TravellerProfileSchema,
} from '../schemas/traveller-profile.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class TravellerProfileRepository extends BaseMongoRepository<TravellerProfileDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', TravellerProfile.name, TravellerProfileSchema);
  }

  /**
   * Find traveller profile by user ID
   * @param userId User ID to search for
   * @returns Traveller profile document or null
   */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<TravellerProfileDocument | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Update traveller profile by user ID
   * @param userId User ID
   * @param data Partial profile data to update
   * @returns Updated profile document or null
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    data: Partial<TravellerProfile>,
  ): Promise<TravellerProfileDocument | null> {
    return this.model.findOneAndUpdate({ userId }, data, { new: true }).exec();
  }

  /**
   * Check if traveller profile exists for user
   * @param userId User ID
   * @returns True if profile exists
   */
  async existsByUserId(userId: string | Types.ObjectId): Promise<boolean> {
    const count = await this.model.countDocuments({ userId });
    return count > 0;
  }

  /**
   * Delete traveller profile by user ID
   * @param userId User ID
   */
  async deleteByUserId(userId: string | Types.ObjectId): Promise<void> {
    await this.model.deleteOne({ userId });
  }
}
