/**
 * Default values for paginated list endpoints.
 *
 * @property PAGE      - Default page number (1-based).
 * @property LIMIT     - Default items per page.
 * @property MAX_LIMIT - Maximum allowed items per page.
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Default CORS configuration values.
 *
 * @property METHODS         - Allowed HTTP methods.
 * @property ALLOWED_HEADERS - Allowed request headers.
 * @property MAX_AGE         - Preflight cache duration in seconds (1 hour).
 */
export const CORS_DEFAULTS = {
  METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Request-Id'],
  MAX_AGE: 3600,
} as const;

/**
 * Default rate-limiting configuration for `@nestjs/throttler`.
 *
 * @property TTL   - Time window in milliseconds (60 seconds).
 * @property LIMIT - Maximum requests per TTL window.
 */
export const RATE_LIMIT_DEFAULTS = {
  TTL: 60_000,
  LIMIT: 100,
} as const;

/**
 * Default request timeout in milliseconds (30 seconds).
 *
 * Used by {@link TimeoutInterceptor} when no custom value is provided.
 */
export const REQUEST_TIMEOUT_MS = 30_000;
