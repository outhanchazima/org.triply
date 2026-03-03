// libs/database/src/lib/repositories/business.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  Business,
  BusinessDocument,
  KycDocument,
  BusinessSchema,
} from '../schemas/business.schema';
import { BusinessStatus } from '../schemas/enums';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class BusinessRepository extends BaseMongoRepository<BusinessDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', Business.name, BusinessSchema);
  }

  /**
   * Find business by ID
   * @param id Business ID
   * @returns Business document or null
   */
  async findById(
    id: string | Types.ObjectId,
  ): Promise<BusinessDocument | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Update business by ID
   * @param id Business ID
   * @param data Partial business fields to update
   * @returns Updated business document or null
   */
  async updateById(
    id: string | Types.ObjectId,
    data: Partial<Business>,
  ): Promise<BusinessDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  /**
   * Find business by registration number
   * @param registrationNumber Business registration number
   * @returns Business document or null
   */
  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findOne({ registrationNumber: registrationNumber.toUpperCase().trim() })
      .exec();
  }

  /**
   * Find all businesses owned by a user
   * @param ownerId Owner user ID
   * @returns Array of business documents
   */
  async findByOwnerId(
    ownerId: string | Types.ObjectId,
  ): Promise<BusinessDocument[]> {
    return this.model.find({ ownerId }).exec();
  }

  /**
   * Find active businesses owned by a user
   * @param ownerId Owner user ID
   * @returns Array of active business documents
   */
  async findActiveByOwnerId(
    ownerId: string | Types.ObjectId,
  ): Promise<BusinessDocument[]> {
    return this.model
      .find({
        ownerId,
        status: { $nin: [BusinessStatus.REJECTED, BusinessStatus.SUSPENDED] },
      })
      .exec();
  }

  /**
   * Find all businesses by status
   * @param status Business status to filter by
   * @returns Array of business documents
   */
  async findByStatus(status: BusinessStatus): Promise<BusinessDocument[]> {
    return this.model.find({ status }).exec();
  }

  /**
   * Find all businesses pending KYC review
   * @returns Array of business documents pending KYC review
   */
  async findPendingKycReview(): Promise<BusinessDocument[]> {
    return this.model
      .find({ status: BusinessStatus.KYC_SUBMITTED })
      .populate('ownerId', 'email displayName')
      .exec();
  }

  /**
   * Update KYC details for a business
   * @param id Business ID
   * @param kycData Partial KYC data
   * @returns Updated business document or null
   */
  async updateKycDetails(
    id: string | Types.ObjectId,
    kycData: Partial<Business['kyc']>,
  ): Promise<BusinessDocument | null> {
    const setData = Object.entries(kycData).reduce(
      (acc, [key, value]) => {
        acc[`kyc.${key}`] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );

    return this.model
      .findByIdAndUpdate(id, { $set: setData }, { new: true })
      .exec();
  }

  /**
   * Add a KYC document to a business
   * @param id Business ID
   * @param document KYC document to add
   * @returns Updated business document or null
   */
  async addKycDocument(
    id: string | Types.ObjectId,
    document: KycDocument,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { $push: { 'kyc.documents': document } },
        { new: true },
      )
      .exec();
  }

  /**
   * Submit KYC for review
   * @param id Business ID
   * @returns Updated business document or null
   */
  async submitKyc(
    id: string | Types.ObjectId,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          status: BusinessStatus.KYC_SUBMITTED,
          'kyc.submittedAt': new Date(),
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Approve KYC for a business
   * @param id Business ID
   * @param reviewedBy User ID of reviewer
   * @returns Updated business document or null
   */
  async approveKyc(
    id: string | Types.ObjectId,
    reviewedBy: string | Types.ObjectId,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          status: BusinessStatus.ACTIVE,
          'kyc.reviewedAt': new Date(),
          'kyc.reviewedBy': reviewedBy,
          'kyc.rejectionReason': null,
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Reject KYC for a business
   * @param id Business ID
   * @param reviewedBy User ID of reviewer
   * @param rejectionReason Reason for rejection
   * @returns Updated business document or null
   */
  async rejectKyc(
    id: string | Types.ObjectId,
    reviewedBy: string | Types.ObjectId,
    rejectionReason: string,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          status: BusinessStatus.REJECTED,
          'kyc.reviewedAt': new Date(),
          'kyc.reviewedBy': reviewedBy,
          'kyc.rejectionReason': rejectionReason,
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Suspend a business
   * @param id Business ID
   * @returns Updated business document or null
   */
  async suspend(id: string | Types.ObjectId): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { status: BusinessStatus.SUSPENDED },
        { new: true },
      )
      .exec();
  }

  /**
   * Reactivate a suspended business
   * @param id Business ID
   * @returns Updated business document or null
   */
  async reactivate(
    id: string | Types.ObjectId,
  ): Promise<BusinessDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { status: BusinessStatus.ACTIVE }, { new: true })
      .exec();
  }

  /**
   * Check if business exists by registration number
   * @param registrationNumber Business registration number
   * @returns True if exists
   */
  async existsByRegistrationNumber(
    registrationNumber: string,
  ): Promise<boolean> {
    const count = await this.model.countDocuments({
      registrationNumber: registrationNumber.toUpperCase().trim(),
    });
    return count > 0;
  }

  /**
   * Count businesses by status
   * @param status Business status
   * @returns Count of businesses
   */
  async countByStatus(status: BusinessStatus): Promise<number> {
    return this.model.countDocuments({ status });
  }
}
