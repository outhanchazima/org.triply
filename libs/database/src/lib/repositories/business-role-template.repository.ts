// libs/database/src/lib/repositories/business-role-template.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  BusinessRoleTemplate,
  BusinessRoleTemplateDocument,
  BusinessRoleTemplateSchema,
} from '../schemas/business-role-template.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class BusinessRoleTemplateRepository extends BaseMongoRepository<BusinessRoleTemplateDocument> {
  constructor(mongoService: MongoService) {
    super(
      mongoService,
      'main',
      BusinessRoleTemplate.name,
      BusinessRoleTemplateSchema,
    );
  }

  /**
   * List templates for a business.
   */
  async findByBusinessId(
    businessId: string | Types.ObjectId,
    includeInactive = false,
  ): Promise<BusinessRoleTemplateDocument[]> {
    const query: Record<string, unknown> = { businessId };
    if (!includeInactive) {
      query.isActive = true;
    }

    return this.model.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find template by business and name.
   */
  async findByBusinessAndName(
    businessId: string | Types.ObjectId,
    name: string,
  ): Promise<BusinessRoleTemplateDocument | null> {
    return this.model
      .findOne({
        businessId,
        name: name.trim(),
      })
      .exec();
  }

  /**
   * Find template by ID scoped to a business.
   */
  async findByIdAndBusinessId(
    templateId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<BusinessRoleTemplateDocument | null> {
    return this.model.findOne({ _id: templateId, businessId }).exec();
  }

  /**
   * Update a template scoped to a business.
   */
  async updateByIdAndBusinessId(
    templateId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
    data: Partial<BusinessRoleTemplate>,
  ): Promise<BusinessRoleTemplateDocument | null> {
    return this.model
      .findOneAndUpdate({ _id: templateId, businessId }, data, { new: true })
      .exec();
  }

  /**
   * Delete a template scoped to a business.
   */
  async deleteByIdAndBusinessId(
    templateId: string | Types.ObjectId,
    businessId: string | Types.ObjectId,
  ): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: templateId, businessId })
      .exec();

    return result.deletedCount > 0;
  }
}
