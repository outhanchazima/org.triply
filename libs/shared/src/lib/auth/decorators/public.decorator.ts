import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by the {@link Public} decorator.
 *
 * Auth guards should check for this key via `Reflector` to skip
 * authentication on decorated routes.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a controller or route handler as **publicly accessible**,
 * bypassing any global authentication guard.
 *
 * The guard must read the `IS_PUBLIC_KEY` metadata via NestJS `Reflector`
 * and skip token validation when it is `true`.
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
