// libs/database/src/lib/repositories/audit-log.repository.ts
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
  AuditLogSchema,
} from '../schemas/audit-log.schema';
import { AuditAction } from '../schemas/enums';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

export interface AuditLogFilters {
  actorId?: string;
  resource?: string;
  action?: AuditAction;
  businessId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditLogRepository extends BaseMongoRepository<AuditLogDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', AuditLog.name, AuditLogSchema);
  }

  /**
   * Find audit logs by actor ID
   * @param actorId The user ID who performed the action
   * @param page Page number for pagination
   * @param limit Records per page
   * @returns Paginated audit logs
   */
  async findByActorId(
    actorId: string | Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.model
        .find({ actorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ actorId }),
    ]);
    return { logs, total };
  }

  /**
   * Find audit logs by resource
   * @param resource Resource type that was modified
   * @param resourceId Resource ID that was modified
   * @param page Page number for pagination
   * @param limit Records per page
   * @returns Paginated audit logs
   */
  async findByResource(
    resource: string,
    resourceId: string,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.model
        .find({ resource, resourceId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ resource, resourceId }),
    ]);
    return { logs, total };
  }

  /**
   * Find audit logs by action type
   * @param action Action type (e.g. CREATE, UPDATE, DELETE)
   * @param page Page number for pagination
   * @param limit Records per page
   * @returns Paginated audit logs
   */
  async findByAction(
    action: AuditAction,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.model
        .find({ action })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ action }),
    ]);
    return { logs, total };
  }

  /**
   * Find audit logs with complex filtering
   * @param filters Filter criteria (actor, resource, action, business, date range)
   * @param page Page number for pagination
   * @param limit Records per page
   * @returns Paginated filtered audit logs
   */
  async findWithFilters(
    filters: AuditLogFilters,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLogDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters.actorId) {
      query.actorId = new Types.ObjectId(filters.actorId);
    }

    if (filters.resource) {
      query.resource = filters.resource;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        (query.createdAt as Record<string, Date>).$gte = filters.from;
      }
      if (filters.to) {
        (query.createdAt as Record<string, Date>).$lte = filters.to;
      }
    }

    const [logs, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query),
    ]);

    return { logs, total };
  }

  /**
   * Find recent audit logs for an actor
   * @param actorId The user ID who performed the actions
   * @param minutes Lookback period in minutes
   * @returns Recent audit logs
   */
  async findRecentByActor(
    actorId: string | Types.ObjectId,
    minutes: number,
  ): Promise<AuditLogDocument[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.model
      .find({
        actorId,
        createdAt: { $gte: since },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Count failed attempts by an actor within a time window
   * @param actorId The user ID who performed the actions
   * @param action Action type (e.g. LOGIN)
   * @param minutes Time window in minutes
   * @returns Count of failed attempts
   */
  async countFailedAttempts(
    actorId: string | Types.ObjectId,
    action: AuditAction,
    minutes: number,
  ): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.model.countDocuments({
      actorId,
      action,
      success: false,
      createdAt: { $gte: since },
    });
  }
}
