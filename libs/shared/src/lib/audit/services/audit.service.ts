// libs/shared/src/lib/services/audit.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { AuditLogRepository, AuditAction } from '@org.triply/database';
import { Types } from 'mongoose';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

export interface AuditLogData {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  failureReason?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Log an audit event
   * This method is async and never throws - failures are logged but don't break the flow
   */
  async log(
    data: AuditLogData,
    actor?: JwtPayload,
    request?: Request,
  ): Promise<void> {
    try {
      const auditLog = await this.auditLogRepository.create({
        actorId: actor?.sub ? new Types.ObjectId(actor.sub) : null,
        actorEmail: actor?.email || null,
        actorRoles: actor?.activeRole ? [actor.activeRole] : [],
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        before: this.sanitizeForAudit(data.before),
        after: this.sanitizeForAudit(data.after),
        metadata: data.metadata || null,
        ipAddress: request?.ip || null,
        userAgent: request?.headers['user-agent'] || null,
        success: data.success ?? true,
        failureReason: data.failureReason || null,
      });

      // Emit event for any listeners
      this.eventEmitter.emit('audit.log.created', auditLog);
    } catch (error) {
      // Log to console but don't throw - audit logging should never break the main flow
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Find audit logs with filters
   */
  async findLogs(
    filters: {
      actorId?: string;
      resource?: string;
      resourceId?: string;
      action?: AuditAction;
      businessId?: string;
      from?: Date;
      to?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<{ logs: unknown[]; total: number; page: number; limit: number }> {
    const { logs, total } = await this.auditLogRepository.findWithFilters(
      filters,
      page,
      limit,
    );

    return {
      logs,
      total,
      page,
      limit,
    };
  }

  /**
   * Get recent audit logs for a specific actor
   */
  async getRecentActivity(actorId: string, minutes = 60): Promise<unknown[]> {
    return this.auditLogRepository.findRecentByActor(actorId, minutes);
  }

  /**
   * Count failed attempts for a specific action
   */
  async countFailedAttempts(
    actorId: string,
    action: AuditAction,
    minutes = 10,
  ): Promise<number> {
    return this.auditLogRepository.countFailedAttempts(
      actorId,
      action,
      minutes,
    );
  }

  /**
   * Get failed login aggregates by day.
   */
  async getFailedLoginsByDay(
    days = 30,
  ): Promise<Array<{ date: string; count: number }>> {
    return this.auditLogRepository.aggregateFailedLoginsByDay(days);
  }

  /**
   * Get suspicious action aggregates.
   */
  async getSuspiciousActions(
    days = 30,
    limit = 50,
  ): Promise<Array<{ action: string; count: number; lastSeenAt: Date }>> {
    return this.auditLogRepository.aggregateSuspiciousActions(days, limit);
  }

  /**
   * Get top permission-denial aggregates.
   */
  async getTopPermissionDenials(
    days = 30,
    limit = 20,
  ): Promise<Array<{ permission: string; count: number }>> {
    return this.auditLogRepository.aggregateTopPermissionDenials(days, limit);
  }

  /**
   * Sanitize data for audit logging - remove sensitive fields
   */
  private sanitizeForAudit(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null {
    if (!data) return null;

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'otp',
      'otpCode',
      'secret',
      'cvv',
      'passportNumber',
      'taxId',
      'creditCard',
      'apiKey',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sanitized[key] = this.sanitizeForAudit(
          value as Record<string, unknown>,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
