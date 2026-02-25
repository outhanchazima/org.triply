import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware that logs a single, structured line for every completed HTTP
 * request, including method, URL, status code, content length, duration,
 * client IP, and user-agent.
 *
 * The log is emitted on the response `finish` event, so the actual status
 * code and content length are accurate.
 *
 * @example
 * ```
 * GET /v1/flights 200 1542b — 87ms — 127.0.0.1 — Mozilla/5.0 ...
 * ```
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  /**
   * Record timing and log the request once the response finishes.
   *
   * @param req  - Express request object.
   * @param res  - Express response object.
   * @param next - Express next function.
   */
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '-';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const contentLength = res.get('content-length') || '0';

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength}b — ${duration}ms — ${ip} — ${userAgent}`,
      );
    });

    next();
  }
}
