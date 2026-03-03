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
  resourceId?: string;
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

    if (filters.resourceId) {
      query.resourceId = filters.resourceId;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.businessId) {
      query.$or = [
        { 'metadata.businessId': filters.businessId },
        { resource: 'Business', resourceId: filters.businessId },
        {
          resource: 'BusinessMembership',
          'metadata.businessId': filters.businessId,
        },
      ];
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

  /**
   * Aggregate failed login attempts grouped by day.
   */
  async aggregateFailedLoginsByDay(
    days = 30,
  ): Promise<Array<{ date: string; count: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.model
      .aggregate([
        {
          $match: {
            action: AuditAction.OTP_FAILED,
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((entry) => ({
      date: String(entry._id),
      count: Number(entry.count || 0),
    }));
  }

  /**
   * Aggregate suspicious security actions.
   */
  async aggregateSuspiciousActions(
    days = 30,
    limit = 50,
  ): Promise<
    Array<{
      action: string;
      count: number;
      lastSeenAt: Date;
    }>
  > {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const suspiciousActions = [
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.PERMISSION_DENIED,
      AuditAction.REFRESH_TOKEN_REUSE_DETECTED,
      AuditAction.ACCOUNT_LOCKED,
      AuditAction.OTP_FAILED,
    ];

    const result = await this.model
      .aggregate([
        {
          $match: {
            action: { $in: suspiciousActions },
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastSeenAt: { $max: '$createdAt' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: Math.max(limit, 1) },
      ])
      .exec();

    return result.map((entry) => ({
      action: String(entry._id),
      count: Number(entry.count || 0),
      lastSeenAt: new Date(entry.lastSeenAt),
    }));
  }

  /**
   * Aggregate top denied permissions by count.
   */
  async aggregateTopPermissionDenials(
    days = 30,
    limit = 20,
  ): Promise<Array<{ permission: string; count: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.model
      .aggregate([
        {
          $match: {
            action: AuditAction.PERMISSION_DENIED,
            createdAt: { $gte: since },
            'metadata.permission': { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$metadata.permission',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: Math.max(limit, 1) },
      ])
      .exec();

    return result.map((entry) => ({
      permission: String(entry._id),
      count: Number(entry.count || 0),
    }));
  }
}
