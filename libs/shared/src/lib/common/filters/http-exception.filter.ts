import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../../interfaces/api-response.interface';

/**
 * Global exception filter that catches all {@link HttpException} instances
 * and returns a standardised {@link ApiErrorResponse} JSON body.
 *
 * Logs each caught exception at `warn` level with the HTTP status, method,
 * URL, and error message.
 *
 * @example
 * ```ts
 * // Register globally in main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * ```
 *
 * @see AllExceptionsFilter for a catch-all that also handles non-HTTP errors.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Handle a caught {@link HttpException}.
   *
   * @param exception - The thrown HTTP exception.
   * @param host      - NestJS argument host (provides access to request/response).
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message ||
          exception.message;

    const details =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>).errors ||
          (exceptionResponse as Record<string, unknown>).message
        : undefined;

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: status,
        message: Array.isArray(message) ? message[0] : String(message),
        ...(details && Array.isArray(details) ? { details } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string,
      },
    };

    this.logger.warn(
      `HTTP ${status} ${request.method} ${request.url} — ${body.error.message}`,
    );

    response.status(status).json(body);
  }
}
