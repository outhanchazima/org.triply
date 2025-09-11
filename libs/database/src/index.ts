/**
 * @fileoverview Database module public API exports
 * @module database
 * @description Central export point for the database module.
 * Provides access to all database services, repositories, interfaces,
 * and utilities for managing PostgreSQL, MongoDB, and Redis connections.
 * @author Outhan Chazima
 * @version 0.0.1
 * 
 
 * @example
 * ```typescript
 * // Import the database module
 * import { 
 *   DatabaseModule,
 *   DatabaseService,
 *   BasePostgresRepository,
 *   QueryFilter,
 *   QueryFilters
 * } from '@org.triply/shared/database';
 * 
 * // Configure the module
 * @Module({
 *   imports: [DatabaseModule.forRoot(config)]
 * })
 * export class AppModule {}
 * ```
 */

/**
 * Database Module
 * @description Main module for database configuration and initialization
 */
export * from './lib/database.module';

/**
 * Constants
 * @description Database-related constants and tokens
 */
export * from './lib/database.constants';

/**
 * Interfaces and Types
 * @description Type definitions for database operations
 */
export * from './lib/interfaces/database.interface';

/**
 * Core Services
 * @description Services for database operations and management
 */
export * from './lib/services/database.service';
export * from './lib/services/postgres.service';
export * from './lib/services/mongo.service';
export * from './lib/services/redis.service';
export * from './lib/services/connection-manager.service';
export * from './lib/services/query-optimization.service';
export * from './lib/services/database-health.service';

/**
 * Repository Pattern
 * @description Base repository implementations for different databases
 */
export * from './lib/repositories/base-postgres.repository';
export * from './lib/repositories/base-mongo.repository';

/**
 * Query Filtering System
 * @description Advanced query filtering, parsing, and decoration utilities
 */
export * from './lib/utils/query-filter.parser';
export * from './lib/filters/query-filter.backend';
export * from './lib/decorators/query-filters.decorator';
export * from './lib/interceptors/query-filter.interceptor';

export * from './lib/database.module';
