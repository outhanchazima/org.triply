// libs/database/src/lib/repositories/refresh-token.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
  RefreshTokenSchema,
} from '../schemas/refresh-token.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class RefreshTokenRepository extends BaseMongoRepository<RefreshTokenDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', RefreshToken.name, RefreshTokenSchema);
  }

  /**
   * Find refresh token by token hash
   * @param tokenHash The hash of the refresh token
   * @returns Token document or null
   */
  async findByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.model.findOne({ tokenHash }).exec();
  }

  /**
   * Find refresh token by document ID
   * @param id Token document ID
   * @returns Token document or null
   */
  async findById(
    id: string | Types.ObjectId,
  ): Promise<RefreshTokenDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find all refresh tokens for a user
   * @param userId User ID
   * @returns Array of token documents
   */
  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<RefreshTokenDocument[]> {
    return this.model.find({ userId }).exec();
  }

  /**
   * Find active (non-revoked, non-expired) refresh tokens for user
   * @param userId User ID
   * @returns Array of active token documents
   */
  async findActiveByUserId(
    userId: string | Types.ObjectId,
  ): Promise<RefreshTokenDocument[]> {
    return this.model
      .find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Count active (non-revoked, non-expired) refresh tokens for user
   * @param userId User ID
   * @returns Active sessions count
   */
  async countActiveByUserId(userId: string | Types.ObjectId): Promise<number> {
    return this.model.countDocuments({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Revoke a token by ID
   * @param id Token ID
   * @returns Updated token document or null
   */
  async revoke(
    id: string | Types.ObjectId,
  ): Promise<RefreshTokenDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { isRevoked: true }, { new: true })
      .exec();
  }

  /**
   * Revoke a token by ID only if it belongs to a specific user
   * @param id Token ID
   * @param userId User ID
   * @returns Updated token document or null
   */
  async revokeByIdForUser(
    id: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<RefreshTokenDocument | null> {
    return this.model
      .findOneAndUpdate({ _id: id, userId }, { isRevoked: true }, { new: true })
      .exec();
  }

  /**
   * Revoke token by token hash
   * @param tokenHash The hash of the refresh token
   * @returns Updated token document or null
   */
  async revokeByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.model
      .findOneAndUpdate({ tokenHash }, { isRevoked: true }, { new: true })
      .exec();
  }

  /**
   * Revoke all tokens for a user
   * @param userId User ID
   */
  async revokeAllForUser(userId: string | Types.ObjectId): Promise<void> {
    await this.model.updateMany({ userId }, { isRevoked: true });
  }

  /**
   * Delete token by token hash
   * @param tokenHash The hash of the refresh token
   */
  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.model.deleteOne({ tokenHash });
  }

  /**
   * Delete all tokens for a user
   * @param userId User ID
   */
  async deleteAllForUser(userId: string | Types.ObjectId): Promise<void> {
    await this.model.deleteMany({ userId });
  }

  /**
   * Delete all expired tokens
   */
  async deleteExpired(): Promise<void> {
    await this.model.deleteMany({ expiresAt: { $lt: new Date() } });
  }

  /**
   * Check if a token is valid (not revoked and not expired)
   * @param tokenHash The hash of the refresh token
   * @returns True if valid
   */
  async isValid(tokenHash: string): Promise<boolean> {
    const token = await this.model.findOne({
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
    return !!token;
  }
}
