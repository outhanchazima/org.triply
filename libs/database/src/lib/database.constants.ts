export const DATABASE_OPTIONS = 'DATABASE_OPTIONS';
export const POSTGRES_CONNECTIONS = 'POSTGRES_CONNECTIONS';
export const MONGO_CONNECTIONS = 'MONGO_CONNECTIONS';
export const REDIS_CONNECTIONS = 'REDIS_CONNECTIONS';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const QUERY_OPERATORS = {
  EQ: 'eq',
  NEQ: 'neq',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  IN: 'in',
  NIN: 'nin',
  LIKE: 'like',
  ILIKE: 'ilike',
  BETWEEN: 'between',
  EXISTS: 'exists',
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',
  CONTAINS: 'contains',
  ICONTAINS: 'icontains',
  STARTS_WITH: 'startsWith',
  ISTARTS_WITH: 'istartsWith',
  ENDS_WITH: 'endsWith',
  IENDS_WITH: 'iendsWith',
  REGEX: 'regex',
  IREGEX: 'iregex',
} as const;

// Django-style lookup mappings
export const DJANGO_LOOKUP_MAP = {
  exact: 'eq',
  iexact: 'eq', // with caseSensitive: false
  contains: 'contains',
  icontains: 'icontains',
  in: 'in',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  startswith: 'startsWith',
  istartswith: 'istartsWith',
  endswith: 'endsWith',
  iendswith: 'iendsWith',
  range: 'between',
  isnull: 'isNull',
  regex: 'regex',
  iregex: 'iregex',
} as const;

export const SORT_ORDER = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;

export const DATABASE_ERRORS = {
  CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',
  DUPLICATE_KEY: 'DATABASE_DUPLICATE_KEY',
  FOREIGN_KEY_VIOLATION: 'DATABASE_FOREIGN_KEY_VIOLATION',
  NOT_FOUND: 'DATABASE_RECORD_NOT_FOUND',
  VALIDATION_ERROR: 'DATABASE_VALIDATION_ERROR',
  TIMEOUT: 'DATABASE_TIMEOUT',
} as const;

export const CACHE_PREFIXES = {
  QUERY: 'query:',
  ENTITY: 'entity:',
  COUNT: 'count:',
  AGGREGATE: 'aggregate:',
} as const;

export const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_MS: 1000,
  VERY_SLOW_QUERY_MS: 5000,
  MAX_QUERY_TIME_MS: 30000,
} as const;
