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
export * from './lib/constants/approval-policy.constants';

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
export * from './lib/utils/pipeline.builder';
export * from './lib/filters/query-filter.backend';
export * from './lib/filters/filterset';
export * from './lib/decorators/query-filters.decorator';
export * from './lib/decorators/api-filters.decorator';
export * from './lib/interceptors/query-filter.interceptor';

/**
 * Auth Schemas
 * @description MongoDB schemas for authentication and user management
 */
export * from './lib/schemas/enums';
export * from './lib/schemas/user.schema';
export * from './lib/schemas/traveller-profile.schema';
export * from './lib/schemas/system-user-profile.schema';
export * from './lib/schemas/business.schema';
export * from './lib/schemas/business-membership.schema';
export * from './lib/schemas/business-role-template.schema';
export * from './lib/schemas/refresh-token.schema';
export * from './lib/schemas/audit-log.schema';
export * from './lib/schemas/file-asset.schema';
export * from './lib/schemas/admin-approval.schema';
export * from './lib/schemas/system-user-access-policy.schema';
export * from './lib/schemas/approval-policy.schema';

/**
 * Auth Repositories
 * @description Repositories for auth-related database operations
 */
export * from './lib/repositories/user.repository';
export * from './lib/repositories/traveller-profile.repository';
export * from './lib/repositories/system-user-profile.repository';
export * from './lib/repositories/business.repository';
export * from './lib/repositories/business-membership.repository';
export * from './lib/repositories/business-role-template.repository';
export * from './lib/repositories/refresh-token.repository';
export * from './lib/repositories/audit-log.repository';
export * from './lib/repositories/file-asset.repository';
export * from './lib/repositories/admin-approval.repository';
export * from './lib/repositories/system-user-access-policy.repository';
export * from './lib/repositories/approval-policy.repository';

/**
 * Auth DTOs
 * @description Data Transfer Objects for authentication
 */
export * from './lib/dtos/auth.dto';

/**
 * Feature Database Modules
 * @description NestJS modules for feature-scoped schema registration
 */
export * from './lib/modules';
