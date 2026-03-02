import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { ApiSuccessResponse } from '../../interfaces/api-response.interface';

/**
 * Global interceptor that wraps every successful controller response in
 * a standardised {@link ApiSuccessResponse} envelope.
 *
 * The envelope includes `success: true`, the original `data`, and a `meta`
 * block with `timestamp`, `path`, and `requestId`.
 *
 * @typeParam T - The type of the original response payload.
 *
 * @example
 * ```ts
 * // Register globally in main.ts
 * app.useGlobalInterceptors(new ResponseTransformInterceptor());
 *
 * // Controller returns `{ flights: [...] }`
 * // Client receives:
 * // {
 * //   success: true,
 * //   data: { flights: [...] },
 * //   meta: { timestamp: "...", path: "/v1/flights", requestId: "..." }
 * // }
 * ```
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  /**
   * Intercept the outgoing response and wrap it in an {@link ApiSuccessResponse}.
   *
   * @param context - The current execution context.
   * @param next    - The next handler in the chain.
   * @returns An observable emitting the wrapped response.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId: request.headers['x-request-id'] as string,
        },
      })),
    );
  }
}
