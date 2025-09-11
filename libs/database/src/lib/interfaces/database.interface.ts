/**
 * @fileoverview Database module interfaces and type definitions
 * @module database/interfaces
 * @description Comprehensive type definitions for database operations including
 * PostgreSQL, MongoDB, and Redis configurations, query options, pagination,
 * aggregation, transactions, and health monitoring.
 */

import { Type } from '@nestjs/common';
import { DataSource, EntitySchema, QueryRunner } from 'typeorm';
import { Connection } from 'mongoose';
import { Redis } from 'ioredis';

/**
 * Database module configuration options
 * @interface DatabaseModuleOptions
 * @description Main configuration interface for initializing the database module
 * with support for multiple database types and monitoring features
 */
export interface DatabaseModuleOptions {
  /** Array of PostgreSQL database configurations */
  postgres?: PostgresConnectionConfig[];

  /** Array of MongoDB database configurations */
  mongodb?: MongoConnectionConfig[];

  /** Array of Redis cache/store configurations */
  redis?: RedisConnectionConfig[];

  /** Enable automatic health checks for all connections (default: true) */
  enableHealthCheck?: boolean;

  /** Enable query logging for debugging and monitoring (default: false) */
  enableQueryLogging?: boolean;

  /** Enable performance monitoring and metrics collection (default: true) */
  enablePerformanceMonitoring?: boolean;

  /** Threshold in milliseconds to identify slow queries (default: 1000ms) */
  slowQueryThreshold?: number;
}

/**
 * PostgreSQL database connection configuration
 * @interface PostgresConnectionConfig
 * @description Configuration options for PostgreSQL connections using TypeORM
 * @example
 * ```typescript
 * const config: PostgresConnectionConfig = {
 *   name: 'main',
 *   host: 'localhost',
 *   port: 5432,
 *   username: 'user',
 *   password: 'password',
 *   database: 'mydb',
 *   entities: [User, Product],
 *   synchronize: false,
 *   logging: ['query', 'error']
 * };
 * ```
 */
export interface PostgresConnectionConfig {
  /** Unique identifier for this connection */
  name: string;
  /** Database host address (default: 'localhost') */
  host?: string;
  /** Database port (default: 5432) */
  port?: number;
  /** Database username */
  username?: string;
  /** Database password */
  password?: string;
  /** Database name */
  database?: string;
  /** Entity classes, schemas, or glob patterns for entity files */
  entities?: (Type<unknown> | EntitySchema | string)[];
  /** Migration file paths or glob patterns */
  migrations?: string[];
  /** Automatically run migrations on connection (default: false) */
  migrationsRun?: boolean;
  /** Custom table name for migration history (default: 'migrations') */
  migrationsTableName?: string;
  /** Synchronize schema with entities (DANGER: use only in development) */
  synchronize?: boolean;
  /** Enable query logging - boolean or array of log types */
  logging?: boolean | string | string[];
  /** SSL/TLS connection options */
  ssl?: unknown;
  /** Maximum number of connections in the pool (deprecated, use maxConnections) */
  poolSize?: number;
  /** Maximum number of connections in the pool (default: 10) */
  maxConnections?: number;
  /** Minimum number of connections in the pool (default: 0) */
  minConnections?: number;
  /** Time in ms before idle connection is closed (default: 10000) */
  idleTimeout?: number;
  /** Time in ms to wait for connection (default: 60000) */
  connectionTimeout?: number;
  /** Time in ms before statement times out (default: 0 - no timeout) */
  statementTimeout?: number;
  /** Time in ms before query times out (default: 0 - no timeout) */
  queryTimeout?: number;
  /** Query result cache configuration */
  cache?: unknown;
  /** Default cache duration in ms (default: 1000) */
  cacheDuration?: number;
  /** Extra connection options specific to the database driver */
  extra?: Record<string, unknown>;
  /** Number of connection retry attempts (default: 10) */
  retryAttempts?: number;
  /** Delay between retry attempts in ms (default: 3000) */
  retryDelay?: number;
}

/**
 * MongoDB database connection configuration
 * @interface MongoConnectionConfig
 * @description Configuration options for MongoDB connections using Mongoose
 * @example
 * ```typescript
 * const config: MongoConnectionConfig = {
 *   name: 'main',
 *   uri: 'mongodb://localhost:27017/mydb',
 *   maxPoolSize: 10,
 *   retryWrites: true
 * };
 * ```
 */
export interface MongoConnectionConfig {
  /** Unique identifier for this connection */
  name: string;
  /** Complete MongoDB connection URI (overrides individual connection params) */
  uri?: string;
  /** MongoDB host address (default: 'localhost') */
  host?: string;
  /** MongoDB port (default: 27017) */
  port?: number;
  /** Database name */
  database?: string;
  /** Database username for authentication */
  username?: string;
  /** Database password for authentication */
  password?: string;
  /** Authentication database (default: 'admin') */
  authSource?: string;
  /** Enable automatic retry of write operations (default: true) */
  retryWrites?: boolean;
  /** Enable automatic retry of read operations (default: true) */
  retryReads?: boolean;
  /** Maximum number of connections in the pool (default: 100) */
  maxPoolSize?: number;
  /** Minimum number of connections in the pool (default: 0) */
  minPoolSize?: number;
  /** Server selection timeout in ms (default: 30000) */
  serverSelectionTimeout?: number;
  /** Socket timeout in ms (default: 0 - no timeout) */
  socketTimeout?: number;
  /** Additional MongoDB driver options */
  options?: Record<string, unknown>;
}

/**
 * Redis cache/store connection configuration
 * @interface RedisConnectionConfig
 * @description Configuration options for Redis connections using ioredis
 * @example
 * ```typescript
 * const config: RedisConnectionConfig = {
 *   name: 'cache',
 *   host: 'localhost',
 *   port: 6379,
 *   keyPrefix: 'app:',
 *   enableReadyCheck: true
 * };
 * ```
 */
export interface RedisConnectionConfig {
  /** Unique identifier for this connection */
  name: string;
  /** Redis host address (default: 'localhost') */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password for authentication */
  password?: string;
  /** Database index to use (default: 0) */
  db?: number;
  /** Prefix for all keys (useful for namespacing) */
  keyPrefix?: string;
  /** Custom retry strategy function */
  retryStrategy?: (times: number) => number | void;
  /** Check Redis server readiness on connect (default: true) */
  enableReadyCheck?: boolean;
  /** Maximum retry attempts per request (default: 20) */
  maxRetriesPerRequest?: number;
  /** Queue commands when disconnected (default: true) */
  enableOfflineQueue?: boolean;
  /** Connection timeout in ms (default: 10000) */
  connectTimeout?: number;
  /** Disconnection timeout in ms (default: 2000) */
  disconnectTimeout?: number;
  /** Command execution timeout in ms (default: 0 - no timeout) */
  commandTimeout?: number;
  /** Auto resubscribe to channels on reconnect (default: true) */
  autoResubscribe?: boolean;
  /** Auto resend unfulfilled commands on reconnect (default: true) */
  autoResendUnfulfilledCommands?: boolean;
  /** Delay connection until first command (default: false) */
  lazyConnect?: boolean;
  /** TLS/SSL connection options */
  tls?: unknown;
  /** Redis Sentinel configuration for HA */
  sentinels?: Array<{ host: string; port: number }>;
  /** Role when using Sentinel (master or slave) */
  role?: 'master' | 'slave';
  /** Preferred slaves for read operations */
  preferredSlaves?: Array<{ ip: string; port: string; flags?: string }>;
}

/**
 * Active database connection wrapper
 * @interface DatabaseConnection
 * @description Represents an active connection to a database with metrics
 */
export interface DatabaseConnection {
  /** Connection identifier */
  name: string;
  /** Database type */
  type: 'postgres' | 'mongodb' | 'redis';
  /** Underlying database connection object */
  connection: DataSource | Connection | Redis;
  /** Connection status */
  isConnected: boolean;
  /** Last time this connection was used */
  lastUsed?: Date;
  /** Performance and usage metrics */
  metrics?: ConnectionMetrics;
}

/**
 * Database connection performance metrics
 * @interface ConnectionMetrics
 * @description Tracks performance and usage statistics for database connections
 */
export interface ConnectionMetrics {
  /** Total number of queries executed */
  totalQueries: number;
  /** Number of failed queries */
  failedQueries: number;
  /** Average query execution time in ms */
  averageQueryTime: number;
  /** Number of slow queries (above threshold) */
  slowQueries: number;
  /** Currently active connections */
  activeConnections: number;
  /** Currently idle connections */
  idleConnections: number;
  /** Total connections in the pool */
  totalConnections: number;
}

/**
 * Comprehensive query options for database operations
 * @interface QueryOptions
 * @description Provides fine-grained control over query execution including
 * pagination, filtering, sorting, caching, and transaction management
 * @example
 * ```typescript
 * const options: QueryOptions = {
 *   page: 1,
 *   limit: 20,
 *   sort: [{ field: 'createdAt', order: 'DESC' }],
 *   filter: [{ field: 'status', operator: 'eq', value: 'active' }],
 *   cache: { ttl: 3600 }
 * };
 * ```
 */
export interface QueryOptions {
  /** Page number for pagination (1-based, default: 1) */
  page?: number;
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
  /** Sort criteria for results */
  sort?: SortOptions[];
  /** Filter conditions to apply */
  filter?: FilterOptions[];
  /** Full-text search configuration */
  search?: SearchOptions;
  /** Fields to select/project (null for all fields) */
  select?: string[];
  /** Relations to populate (MongoDB) or join (PostgreSQL) */
  populate?: PopulateOptions[];
  /** Query result caching configuration */
  cache?: CacheOptions;
  /** Transaction context for query execution */
  transaction?: QueryRunner;
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Include query execution plan (for debugging) */
  explain?: boolean;
}

/**
 * Sort configuration for query results
 * @interface SortOptions
 * @description Defines sorting criteria for database queries
 */
export interface SortOptions {
  /** Field name to sort by (supports dot notation for nested fields) */
  field: string;
  /** Sort direction: ASC (ascending) or DESC (descending) */
  order: 'ASC' | 'DESC';
}

/**
 * Filter configuration for query conditions
 * @interface FilterOptions
 * @description Defines filtering criteria with various operators
 * @example
 * ```typescript
 * const filter: FilterOptions = {
 *   field: 'price',
 *   operator: 'between',
 *   value: [10, 100]
 * };
 * ```
 */
export interface FilterOptions {
  /** Field name to filter on (supports dot notation for nested fields) */
  field: string;
  /** Comparison operator to use */
  operator: FilterOperator;
  /** Value(s) to compare against */
  value: unknown;
  /** Case sensitivity for string comparisons (default: false) */
  caseSensitive?: boolean;
}

/**
 * Available filter operators for query conditions
 * @type FilterOperator
 * @description Comprehensive set of comparison and matching operators
 *
 * Comparison operators:
 * - eq: Equal to
 * - neq: Not equal to
 * - gt: Greater than
 * - gte: Greater than or equal to
 * - lt: Less than
 * - lte: Less than or equal to
 *
 * Array operators:
 * - in: Value in array
 * - nin: Value not in array
 *
 * String operators:
 * - like: SQL LIKE pattern matching (case-sensitive)
 * - ilike: SQL ILIKE pattern matching (case-insensitive)
 * - contains: String contains substring
 * - startsWith: String starts with prefix
 * - endsWith: String ends with suffix
 * - regex: Regular expression matching
 *
 * Range operators:
 * - between: Value between two bounds (inclusive)
 *
 * Existence operators:
 * - exists: Field exists
 * - isNull: Field is null
 * - isNotNull: Field is not null
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'between'
  | 'exists'
  | 'isNull'
  | 'isNotNull'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'regex';

/**
 * Full-text search configuration
 * @interface SearchOptions
 * @description Configuration for text-based searching across multiple fields
 * @example
 * ```typescript
 * const search: SearchOptions = {
 *   query: 'john doe',
 *   fields: ['name', 'email', 'description'],
 *   fuzzy: true,
 *   threshold: 0.3
 * };
 * ```
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Fields to search in (supports dot notation) */
  fields: string[];
  /** Enable fuzzy matching for typo tolerance (default: false) */
  fuzzy?: boolean;
  /** Fuzzy matching threshold (0-1, lower = more fuzzy, default: 0.6) */
  threshold?: number;
  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean;
}

/**
 * Relation population/join configuration
 * @interface PopulateOptions
 * @description Configuration for loading related data (MongoDB populate or SQL joins)
 * @example
 * ```typescript
 * const populate: PopulateOptions = {
 *   path: 'author',
 *   select: ['name', 'email'],
 *   populate: [{ path: 'profile' }]
 * };
 * ```
 */
export interface PopulateOptions {
  /** Relation path to populate */
  path: string;
  /** Fields to select from populated documents */
  select?: string[];
  /** Nested population configuration */
  populate?: PopulateOptions[];
  /** Additional filter conditions for populated data */
  match?: Record<string, unknown>;
  /** Additional options (sort, limit, etc.) */
  options?: Record<string, unknown>;
}

/**
 * Query result caching configuration
 * @interface CacheOptions
 * @description Configuration for caching query results to improve performance
 */
export interface CacheOptions {
  /** Custom cache key (auto-generated if not provided) */
  key?: string;
  /** Time to live in seconds (default: 3600) */
  ttl?: number;
  /** Force cache refresh (default: false) */
  refresh?: boolean;
  /** Compress cached data (default: false) */
  compress?: boolean;
}

/**
 * Paginated query result wrapper
 * @interface PaginationResult
 * @template T - Type of data items
 * @description Standard pagination response structure with metadata
 */
export interface PaginationResult<T> {
  /** Array of result items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-based) */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrev: boolean;
  };
  /** Additional metadata */
  meta?: {
    /** Query execution time in ms */
    executionTime?: number;
    /** Whether result was served from cache */
    cached?: boolean;
    /** Original query parameters (for debugging) */
    query?: unknown;
  };
}

/**
 * Aggregation query configuration
 * @interface AggregationOptions
 * @description Configuration for data aggregation operations
 * @example
 * ```typescript
 * const aggregation: AggregationOptions = {
 *   groupBy: ['category', 'status'],
 *   count: true,
 *   sum: ['amount'],
 *   avg: ['rating'],
 *   having: [{ field: 'count', operator: 'gt', value: 10 }]
 * };
 * ```
 */
export interface AggregationOptions {
  /** Fields to group by */
  groupBy?: string[];
  /** Include count of items in each group */
  count?: boolean;
  /** Fields to sum */
  sum?: string[];
  /** Fields to average */
  avg?: string[];
  /** Fields to find minimum value */
  min?: string[];
  /** Fields to find maximum value */
  max?: string[];
  /** Filter conditions on aggregated results */
  having?: FilterOptions[];
  /** Sort aggregated results */
  sort?: SortOptions[];
  /** Limit number of aggregation results */
  limit?: number;
}

/**
 * Aggregation query result
 * @interface AggregationResult
 * @description Result structure for aggregation queries
 */
export interface AggregationResult {
  /** Aggregated groups */
  groups: Array<{
    /** Group key values */
    key: Record<string, unknown>;
    /** Number of items in group */
    count?: number;
    /** Sum values for numeric fields */
    sum?: Record<string, number>;
    /** Average values for numeric fields */
    avg?: Record<string, number>;
    /** Minimum values */
    min?: Record<string, unknown>;
    /** Maximum values */
    max?: Record<string, unknown>;
  }>;
  /** Total number of groups */
  total?: number;
  /** Query execution time in ms */
  executionTime?: number;
}

/**
 * Database transaction configuration
 * @interface TransactionOptions
 * @description Configuration for database transaction execution
 */
export interface TransactionOptions {
  /** Transaction isolation level (PostgreSQL) */
  isolationLevel?:
    | 'READ UNCOMMITTED'
    | 'READ COMMITTED'
    | 'REPEATABLE READ'
    | 'SERIALIZABLE';
  /** Transaction timeout in ms (default: 60000) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 3) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

/**
 * Bulk operation configuration
 * @interface BulkOperationOptions
 * @description Configuration for bulk database operations
 */
export interface BulkOperationOptions {
  /** Execute operations in order (default: true) */
  ordered?: boolean;
  /** Skip validation for performance (default: false) */
  skipValidation?: boolean;
  /** Throw error on first failure (default: true) */
  throwOnError?: boolean;
  /** Transaction context for bulk operations */
  transaction?: QueryRunner;
}

/**
 * Bulk write operation result
 * @interface BulkWriteResult
 * @description Result structure for bulk write operations
 */
export interface BulkWriteResult {
  /** Number of documents inserted */
  insertedCount: number;
  /** Number of documents updated */
  updatedCount: number;
  /** Number of documents deleted */
  deletedCount: number;
  /** Array of errors if any operations failed */
  errors?: Array<{
    /** Index of failed operation */
    index: number;
    /** Error details */
    error: Error;
    /** Document that failed (if available) */
    document?: unknown;
  }>;
}

/**
 * Query performance metrics
 * @interface QueryPerformance
 * @description Tracks performance metrics for individual queries
 */
export interface QueryPerformance {
  /** Query string or command */
  query: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Number of rows affected or returned */
  rowsAffected: number;
  /** Whether result was served from cache */
  cached: boolean;
  /** Whether query exceeded slow threshold */
  slow: boolean;
  /** Query execution timestamp */
  timestamp: Date;
  /** Connection name used */
  connection: string;
  /** Additional metadata (parameters, context, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Database health check result
 * @interface HealthCheckResult
 * @description Health status of all database connections
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Individual connection health details */
  connections: Array<{
    /** Connection name */
    name: string;
    /** Database type */
    type: string;
    /** Connection status */
    status: 'connected' | 'disconnected' | 'error';
    /** Connection latency in ms */
    latency?: number;
    /** Error message if connection failed */
    error?: string;
    /** Connection performance metrics */
    metrics?: ConnectionMetrics;
  }>;
  /** Health check timestamp */
  timestamp: Date;
}

/**
 * Base repository interface for database operations
 * @interface IBaseRepository
 * @template T - Entity type
 * @description Standard interface for repository pattern implementation
 * providing CRUD operations and advanced querying capabilities
 */
export interface IBaseRepository<T> {
  /**
   * Find a single document by ID
   * @param id - Document ID
   * @param options - Query options
   * @returns Promise resolving to document or null if not found
   */
  findOne(id: string | number, options?: QueryOptions): Promise<T | null>;

  /**
   * Find multiple documents with pagination
   * @param options - Query options including filters, sorting, pagination
   * @returns Promise resolving to paginated results
   */
  findMany(options?: QueryOptions): Promise<PaginationResult<T>>;

  /**
   * Create a new document
   * @param data - Document data
   * @param options - Query options
   * @returns Promise resolving to created document
   */
  create(data: Partial<T>, options?: QueryOptions): Promise<T>;

  /**
   * Create multiple documents in bulk
   * @param data - Array of document data
   * @param options - Bulk operation options
   * @returns Promise resolving to bulk write result
   */
  createMany(
    data: Partial<T>[],
    options?: BulkOperationOptions
  ): Promise<BulkWriteResult>;

  /**
   * Update a document by ID
   * @param id - Document ID
   * @param data - Update data
   * @param options - Query options
   * @returns Promise resolving to updated document
   */
  update(
    id: string | number,
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<T>;

  /**
   * Update multiple documents matching filters
   * @param filter - Filter conditions
   * @param data - Update data
   * @param options - Query options
   * @returns Promise resolving to number of updated documents
   */
  updateMany(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<number>;

  /**
   * Delete a document by ID
   * @param id - Document ID
   * @param options - Query options
   * @returns Promise resolving to true if deleted
   */
  delete(id: string | number, options?: QueryOptions): Promise<boolean>;

  /**
   * Delete multiple documents matching filters
   * @param filter - Filter conditions
   * @param options - Query options
   * @returns Promise resolving to number of deleted documents
   */
  deleteMany(filter: FilterOptions[], options?: QueryOptions): Promise<number>;

  /**
   * Count documents matching filters
   * @param filter - Filter conditions
   * @param options - Query options
   * @returns Promise resolving to document count
   */
  count(filter?: FilterOptions[], options?: QueryOptions): Promise<number>;

  /**
   * Check if documents exist matching filters
   * @param filter - Filter conditions
   * @param options - Query options
   * @returns Promise resolving to boolean
   */
  exists(filter: FilterOptions[], options?: QueryOptions): Promise<boolean>;

  /**
   * Perform aggregation operations
   * @param options - Aggregation options
   * @returns Promise resolving to aggregation results
   */
  aggregate(options: AggregationOptions): Promise<AggregationResult>;

  /**
   * Perform full-text search
   * @param searchOptions - Search configuration
   * @param queryOptions - Additional query options
   * @returns Promise resolving to paginated search results
   */
  search(
    searchOptions: SearchOptions,
    queryOptions?: QueryOptions
  ): Promise<PaginationResult<T>>;

  /**
   * Execute operations within a transaction
   * @param fn - Function to execute within transaction
   * @param options - Transaction options
   * @returns Promise resolving to transaction result
   */
  transaction<R>(
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R>;
}
