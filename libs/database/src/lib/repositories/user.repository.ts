// libs/database/src/lib/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { User, UserDocument, UserSchema } from '../schemas/user.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class UserRepository extends BaseMongoRepository<UserDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', User.name, UserSchema);
  }

  /**
   * Find user by ID
   * @param id User ID
   * @returns User document or null
   */
  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find user by email address
   * @param email User email to search for
   * @returns User document or null
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  /**
   * Find user by email including OTP fields (otpCode, otpExpires, otpPurpose)
   * @param email User email to search for
   * @returns User document with OTP fields or null
   */
  async findByEmailWithOtp(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase().trim() })
      .select('+otpCode +otpExpires +otpPurpose')
      .exec();
  }

  /**
   * Find user by Google OAuth ID
   * @param googleId Google OAuth ID
   * @returns User document or null
   */
  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.model.findOne({ googleId }).exec();
  }

  /**
   * Update user by email address
   * @param email User email
   * @param data Partial user data to update
   * @returns Updated user document or null
   */
  async updateByEmail(
    email: string,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.model
      .findOneAndUpdate({ email: email.toLowerCase().trim() }, data, {
        new: true,
      })
      .exec();
  }

  /**
   * Update user by ID
   * @param id User ID
   * @param data Partial user data to update
   * @returns Updated user document or null
   */
  async updateById(
    id: string | Types.ObjectId,
    data: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  /**
   * Find users with optional filters and pagination
   * @param filters Query filters
   * @param page Page number (1-based)
   * @param limit Page size
   * @returns Paginated users and total count
   */
  async findUsers(
    filters: {
      email?: string;
      isTraveller?: boolean;
      isSystemUser?: boolean;
      isActive?: boolean;
    } = {},
    page = 1,
    limit = 20,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (typeof filters.isTraveller === 'boolean') {
      query.isTraveller = filters.isTraveller;
    }

    if (typeof filters.isSystemUser === 'boolean') {
      query.isSystemUser = filters.isSystemUser;
    }

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }

    if (filters.email) {
      query.email = {
        $regex: filters.email.toLowerCase().trim(),
        $options: 'i',
      };
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1);

    const [users, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.max(limit, 1))
        .exec(),
      this.model.countDocuments(query),
    ]);

    return { users, total };
  }

  async findActiveTravellers(): Promise<UserDocument[]> {
    return this.model.find({ isActive: true, isTraveller: true }).exec();
  }

  async findActiveSystemUsers(): Promise<UserDocument[]> {
    return this.model.find({ isActive: true, isSystemUser: true }).exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      email: email.toLowerCase().trim(),
    });
    return count > 0;
  }

  async setOtp(
    email: string,
    otpHash: string,
    expiresAt: Date,
    purpose: string,
  ): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      {
        otpCode: otpHash,
        otpExpires: expiresAt,
        otpPurpose: purpose,
      },
    );
  }

  async clearOtp(email: string): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      {
        $unset: { otpCode: 1, otpExpires: 1, otpPurpose: 1 },
      },
    );
  }

  async incrementLoginAttempts(email: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    if (user.lockUntil && user.lockUntil < new Date()) {
      user.loginAttempts = 1;
      user.lockUntil = null;
    } else {
      user.loginAttempts += 1;
    }

    if (user.loginAttempts >= 5 && !user.isLocked()) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
    }

    return user.save();
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      { loginAttempts: 0, lockUntil: null },
    );
  }

  async recordLogin(email: string, ipAddress: string): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginAttempts: 0,
        lockUntil: null,
        isEmailVerified: true,
      },
    );
  }

  async linkGoogleId(email: string, googleId: string): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      {
        googleId,
        $addToSet: { authProviders: 'google' },
      },
    );
  }

  /**
   * Add an authentication provider to the user
   * @param email User email
   * @param provider Provider name ('otp' or 'google')
   */
  async addAuthProvider(
    email: string,
    provider: 'otp' | 'google',
  ): Promise<void> {
    await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      { $addToSet: { authProviders: provider } },
    );
  }

  async activateTraveller(userId: string | Types.ObjectId): Promise<void> {
    await this.model.updateOne({ _id: userId }, { isTraveller: true });
  }

  async deactivateUser(userId: string | Types.ObjectId): Promise<void> {
    await this.model.updateOne({ _id: userId }, { isActive: false });
  }
}
