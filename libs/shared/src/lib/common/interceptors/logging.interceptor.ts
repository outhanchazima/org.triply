import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Global interceptor that logs the HTTP method, URL, and response time
 * for every request.
 *
 * - Successful responses are logged at `log` level.
 * - Failed responses are logged at `error` level, including the error message.
 *
 * @example
 * ```ts
 * app.useGlobalInterceptors(new LoggingInterceptor());
 * // Output: "GET /v1/flights — 42ms"
 * ```
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * Intercept the request, record the start time, and log the duration
   * once the response completes or errors.
   *
   * @param context - The current execution context.
   * @param next    - The next handler in the chain.
   * @returns An observable of the response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(`${method} ${url} — ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${url} — ${duration}ms — ${error.message}`,
          );
        },
      }),
    );
  }
}
