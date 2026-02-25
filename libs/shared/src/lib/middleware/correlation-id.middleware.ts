import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware that ensures every HTTP request carries a unique correlation ID
 * in the `x-request-id` header.
 *
 * - If the client already provides an `x-request-id` header, it is preserved.
 * - Otherwise a new UUID v4 is generated automatically.
 * - The correlation ID is also set on the **response** headers so the client
 *   can correlate logs with the server.
 *
 * Apply this middleware globally (e.g. in `AppModule.configure()`) so that
 * all downstream filters, interceptors, and decorators (such as
 * {@link RequestId}) can rely on the header being present.
 *
 * @example
 * ```ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /**
   * Attach or forward the `x-request-id` header.
   *
   * @param req  - Express request object.
   * @param res  - Express response object.
   * @param next - Express next function.
   */
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = correlationId;
    res.setHeader('x-request-id', correlationId);
    next();
  }
}
