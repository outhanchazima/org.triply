import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Parameter decorator that extracts the `x-request-id` header from the
 * incoming HTTP request.
 *
 * Best used in combination with {@link CorrelationIdMiddleware}, which
 * ensures every request has an `x-request-id` header (auto-generated
 * if not provided by the client).
 *
 * @returns The request ID string, or `undefined` if the header is absent.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@RequestId() requestId: string) {
 *   this.logger.log(`Handling request ${requestId}`);
 * }
 * ```
 */
export const RequestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-request-id'] as string | undefined;
  },
);
