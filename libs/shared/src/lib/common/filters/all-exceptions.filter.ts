import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../../interfaces/api-response.interface';

/**
 * Catch-all exception filter that handles **every** thrown error — including
 * unhandled runtime exceptions that are not `HttpException` subclasses.
 *
 * - For `HttpException` instances the original status code is preserved.
 * - For all other errors a `500 Internal Server Error` is returned.
 * - In non-production environments the stack trace is included in the
 *   response body for easier debugging.
 *
 * @example
 * ```ts
 * // Register globally in main.ts (after HttpExceptionFilter)
 * app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
 * ```
 *
 * @see HttpExceptionFilter for a more targeted filter.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Handle any caught exception.
   *
   * @param exception - The thrown value (may not be an `Error`).
   * @param host      - NestJS argument host.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: status,
        message,
        ...(process.env.NODE_ENV !== 'production' && exception instanceof Error
          ? { details: exception.stack }
          : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string,
      },
    };

    response.status(status).json(body);
  }
}
