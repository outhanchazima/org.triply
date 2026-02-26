/**
 * @fileoverview Database module constants and injection tokens
 * @module database/constants
 * @description Centralised constant definitions used throughout the database module.
 * Includes NestJS dependency-injection tokens, query-operator enums,
 * Django-style lookup mappings, error codes, cache key prefixes, and
 * performance thresholds.
 *
 * All objects are declared `as const` so their literal types can be
 * inferred by TypeScript — prefer the values of these objects over
 * hard-coded strings elsewhere in the codebase.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

// ─── NestJS Dependency-Injection Tokens ──────────────────────

/**
 * Injection token for the top-level {@link DatabaseModuleOptions} object
 * provided via `DatabaseModule.forRoot()` or `DatabaseModule.forRootAsync()`.
 *
 * @example
 * ```typescript
 * @Inject(DATABASE_OPTIONS) private readonly options: DatabaseModuleOptions
 * ```
 */
export const DATABASE_OPTIONS = 'DATABASE_OPTIONS';

/**
 * Injection token for the array of registered PostgreSQL connection
 * descriptors (`{ name, config }`).
 *
 * Populated automatically by `DatabaseModule.forRoot()`.
 */
export const POSTGRES_CONNECTIONS = 'POSTGRES_CONNECTIONS';

/**
 * Injection token for the array of registered MongoDB connection
 * descriptors (`{ name, config }`).
 *
 * Populated automatically by `DatabaseModule.forRoot()`.
 */
export const MONGO_CONNECTIONS = 'MONGO_CONNECTIONS';

/**
 * Injection token for the array of registered Redis connection
 * descriptors (`{ name, config }`).
 *
 * Populated automatically by `DatabaseModule.forRoot()`.
 */
export const REDIS_CONNECTIONS = 'REDIS_CONNECTIONS';

// ─── Pagination Defaults ─────────────────────────────────────

/**
 * Default number of items returned per page when the client does not
 * specify a `page_size` / `pageSize` query parameter.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Hard upper-bound for the number of items that can be requested in a
 * single page. Requests exceeding this value are silently clamped.
 */
export const MAX_PAGE_SIZE = 100;

// ─── Query Operators ─────────────────────────────────────────

/**
 * Canonical query operator identifiers used internally by the
 * filtering system.
 *
 * Prefer referencing these constants rather than hard-coding operator
 * strings so that typos are caught at compile time.
 *
 * @example
 * ```typescript
 * const filter: FilterOptions = {
 *   field: 'name',
 *   operator: QUERY_OPERATORS.ICONTAINS,
 *   value: 'john',
 * };
 * ```
 */
export const QUERY_OPERATORS = {
  /** Exact equality (`=`) */
  EQ: 'eq',
  /** Not equal (`!=` / `<>`) */
  NEQ: 'neq',
  /** Greater than (`>`) */
  GT: 'gt',
  /** Greater than or equal (`>=`) */
  GTE: 'gte',
  /** Less than (`<`) */
  LT: 'lt',
  /** Less than or equal (`<=`) */
  LTE: 'lte',
  /** Value is contained in a given array (`IN`) */
  IN: 'in',
  /** Value is NOT contained in a given array (`NOT IN`) */
  NIN: 'nin',
  /** SQL `LIKE` — case-sensitive pattern match */
  LIKE: 'like',
  /** SQL `ILIKE` — case-insensitive pattern match (PostgreSQL) */
  ILIKE: 'ilike',
  /** Value falls within an inclusive range (`BETWEEN`) */
  BETWEEN: 'between',
  /** Field exists (MongoDB `$exists`) */
  EXISTS: 'exists',
  /** Field value is `NULL` */
  IS_NULL: 'isNull',
  /** Field value is **not** `NULL` */
  IS_NOT_NULL: 'isNotNull',
  /** Case-sensitive substring match */
  CONTAINS: 'contains',
  /** Case-insensitive substring match */
  ICONTAINS: 'icontains',
  /** Case-sensitive prefix match */
  STARTS_WITH: 'startsWith',
  /** Case-insensitive prefix match */
  ISTARTS_WITH: 'istartsWith',
  /** Case-sensitive suffix match */
  ENDS_WITH: 'endsWith',
  /** Case-insensitive suffix match */
  IENDS_WITH: 'iendsWith',
  /** Case-sensitive regular-expression match */
  REGEX: 'regex',
  /** Case-insensitive regular-expression match */
  IREGEX: 'iregex',
} as const;

// ─── Django-Style Lookup Map ─────────────────────────────────

/**
 * Maps **Django REST Framework / django-filter** lookup suffixes
 * (used in query parameters like `?field__icontains=value`) to the
 * internal {@link QUERY_OPERATORS} values consumed by the filtering
 * pipeline.
 *
 * @see {@link QueryFilterParser} for the code that consumes this map.
 *
 * @example
 * ```
 * GET /api/users?name__icontains=john&age__gte=18&status__in=active,pending
 * ```
 */
export const DJANGO_LOOKUP_MAP = {
  /** Exact match (default when no lookup is specified) */
  exact: 'eq',
  /** Case-insensitive exact match — mapped to `eq` with `caseSensitive: false` */
  iexact: 'eq',
  /** Case-sensitive substring containment */
  contains: 'contains',
  /** Case-insensitive substring containment */
  icontains: 'icontains',
  /** Value membership in a comma-separated list */
  in: 'in',
  /** Greater than */
  gt: 'gt',
  /** Greater than or equal */
  gte: 'gte',
  /** Less than */
  lt: 'lt',
  /** Less than or equal */
  lte: 'lte',
  /** Case-sensitive prefix match */
  startswith: 'startsWith',
  /** Case-insensitive prefix match */
  istartswith: 'istartsWith',
  /** Case-sensitive suffix match */
  endswith: 'endsWith',
  /** Case-insensitive suffix match */
  iendswith: 'iendsWith',
  /** Inclusive range — expects `lo,hi` */
  range: 'between',
  /** Null check — `true` → `IS NULL`, `false` → `IS NOT NULL` */
  isnull: 'isNull',
  /** Case-sensitive regular expression */
  regex: 'regex',
  /** Case-insensitive regular expression */
  iregex: 'iregex',
} as const;

// ─── Sort Order ──────────────────────────────────────────────

/**
 * Allowed sort directions.
 *
 * @example
 * ```typescript
 * const sort: SortOptions = { field: 'createdAt', order: SORT_ORDER.DESC };
 * ```
 */
export const SORT_ORDER = {
  /** Ascending order (A → Z, 0 → 9, oldest → newest) */
  ASC: 'ASC',
  /** Descending order (Z → A, 9 → 0, newest → oldest) */
  DESC: 'DESC',
} as const;

// ─── Error Codes ─────────────────────────────────────────────

/**
 * Standardised error codes emitted by the database module.
 *
 * Consumers can match on these codes in exception filters or error
 * handlers to provide user-friendly messages or trigger specific
 * recovery logic.
 *
 * @example
 * ```typescript
 * if (error.code === DATABASE_ERRORS.DUPLICATE_KEY) {
 *   throw new ConflictException('A record with that key already exists.');
 * }
 * ```
 */
export const DATABASE_ERRORS = {
  /** Failed to establish or maintain a database connection */
  CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  /** A query execution failed (syntax error, constraint, etc.) */
  QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  /** A transaction could not be committed or rolled back */
  TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',
  /** Unique-constraint / duplicate-key violation */
  DUPLICATE_KEY: 'DATABASE_DUPLICATE_KEY',
  /** Foreign-key constraint violation */
  FOREIGN_KEY_VIOLATION: 'DATABASE_FOREIGN_KEY_VIOLATION',
  /** Requested record was not found */
  NOT_FOUND: 'DATABASE_RECORD_NOT_FOUND',
  /** Data failed schema or business-rule validation */
  VALIDATION_ERROR: 'DATABASE_VALIDATION_ERROR',
  /** Query or statement exceeded its configured timeout */
  TIMEOUT: 'DATABASE_TIMEOUT',
} as const;

// ─── Cache Key Prefixes ──────────────────────────────────────

/**
 * Standard key prefixes used when storing query results or entity
 * snapshots in Redis. Using consistent prefixes simplifies cache
 * invalidation via pattern-based deletion (e.g. `KEYS query:*`).
 *
 * @example
 * ```typescript
 * const cacheKey = `${CACHE_PREFIXES.ENTITY}user:${userId}`;
 * ```
 */
export const CACHE_PREFIXES = {
  /** Prefix for cached query results */
  QUERY: 'query:',
  /** Prefix for cached individual entities */
  ENTITY: 'entity:',
  /** Prefix for cached count results */
  COUNT: 'count:',
  /** Prefix for cached aggregation results */
  AGGREGATE: 'aggregate:',
} as const;

// ─── Performance Thresholds ──────────────────────────────────

/**
 * Default performance thresholds used by {@link QueryOptimizationService}
 * to classify query execution times.
 *
 * These can be overridden via {@link DatabaseModuleOptions.slowQueryThreshold}.
 *
 * @example
 * ```typescript
 * if (executionTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
 *   logger.warn('Slow query detected');
 * }
 * ```
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Queries taking longer than this (ms) are flagged as **slow** */
  SLOW_QUERY_MS: 1000,
  /** Queries taking longer than this (ms) are flagged as **very slow** */
  VERY_SLOW_QUERY_MS: 5000,
  /** Hard upper-bound (ms) — queries exceeding this may be forcibly terminated */
  MAX_QUERY_TIME_MS: 30000,
} as const;
