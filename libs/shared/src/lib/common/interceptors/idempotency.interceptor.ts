// libs/shared/src/lib/common/interceptors/idempotency.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CachedIdempotencyResponse {
  expiresAt: number;
  payload: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private static readonly cache = new Map<string, CachedIdempotencyResponse>();
  private static readonly ttlMs = 60 * 60 * 1000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { sub?: string } }>();
    const response = http.getResponse<Response>();

    if (!request || !response) {
      return next.handle();
    }

    const method = request.method.toUpperCase();
    const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    if (!mutatingMethods.includes(method)) {
      return next.handle();
    }

    const rawKey = request.headers['idempotency-key'];
    const idempotencyKey =
      typeof rawKey === 'string'
        ? rawKey.trim()
        : Array.isArray(rawKey)
          ? rawKey[0]?.trim()
          : '';

    if (!idempotencyKey) {
      return next.handle();
    }

    this.evictExpiredEntries();

    const subjectKey = request.user?.sub || request.ip || 'anonymous';
    const bodyHash = createHash('sha256')
      .update(JSON.stringify(request.body || {}))
      .digest('hex');

    const cacheKey = `${subjectKey}:${method}:${request.originalUrl}:${idempotencyKey}:${bodyHash}`;
    const now = Date.now();

    const cached = IdempotencyInterceptor.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      response.setHeader('X-Idempotency-Replayed', 'true');
      return of(cached.payload);
    }

    return next.handle().pipe(
      tap((payload) => {
        IdempotencyInterceptor.cache.set(cacheKey, {
          expiresAt: now + IdempotencyInterceptor.ttlMs,
          payload,
        });
      }),
    );
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [key, value] of IdempotencyInterceptor.cache.entries()) {
      if (value.expiresAt <= now) {
        IdempotencyInterceptor.cache.delete(key);
      }
    }
  }
}
