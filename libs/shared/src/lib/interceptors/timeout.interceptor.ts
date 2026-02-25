import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  Observable,
  throwError,
  timeout,
  catchError,
  TimeoutError,
} from 'rxjs';

/**
 * Global interceptor that aborts requests exceeding a configurable timeout.
 *
 * If the handler does not emit a response within `timeoutMs` milliseconds,
 * a `408 Request Timeout` ({@link RequestTimeoutException}) is thrown.
 *
 * @example
 * ```ts
 * // 15-second timeout
 * app.useGlobalInterceptors(new TimeoutInterceptor(15_000));
 * ```
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  /**
   * @param timeoutMs - Maximum allowed response time in milliseconds
   *   (default `30 000` — 30 seconds).
   */
  constructor(private readonly timeoutMs = 30_000) {}

  /**
   * Intercept the request and apply the timeout operator.
   *
   * @param _context - The current execution context (unused).
   * @param next     - The next handler in the chain.
   * @returns An observable that errors with {@link RequestTimeoutException}
   *   if the timeout elapses.
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timed out'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
