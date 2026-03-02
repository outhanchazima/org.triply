// libs/shared/src/lib/decorators/current-business.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the active business ID from the current user
 * @example
 * @Get()
 * getBusinessData(@CurrentBusiness() businessId: string | null) {
 *   return businessId;
 * }
 */
export const CurrentBusiness = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: { activeBusinessId: string | null } }>();
    return request.user?.activeBusinessId ?? null;
  },
);
