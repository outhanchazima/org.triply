// libs/shared/src/lib/audit/interceptors/audit.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditAction } from '@org.triply/database';
import type { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { AuditService } from '../services/audit.service';
import { AUDIT_METADATA_KEY, AuditConfig } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const config = this.reflector.getAllAndOverride<AuditConfig>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: JwtPayload; params?: Record<string, string> }
      >();

    const startedAt = Date.now();
    const actor = request.user;
    const resourceId = config.resourceIdParam
      ? request.params?.[config.resourceIdParam]
      : undefined;

    return next.handle().pipe(
      tap((response) => {
        void this.auditService.log(
          {
            action: config.action,
            resource: config.resource,
            resourceId,
            metadata: {
              durationMs: Date.now() - startedAt,
            },
            before: config.includePayload
              ? (request.body as Record<string, unknown>)
              : undefined,
            after: config.includePayload
              ? (response as Record<string, unknown>)
              : undefined,
          },
          actor,
          request,
        );
      }),
      catchError((error: unknown) => {
        void this.auditService.log(
          {
            action: config.action || AuditAction.SUSPICIOUS_ACTIVITY,
            resource: config.resource,
            resourceId,
            success: false,
            failureReason:
              error instanceof Error ? error.message : 'Unknown failure',
            metadata: {
              durationMs: Date.now() - startedAt,
            },
            before: config.includePayload
              ? (request.body as Record<string, unknown>)
              : undefined,
          },
          actor,
          request,
        );

        return throwError(() => error);
      }),
    );
  }
}
