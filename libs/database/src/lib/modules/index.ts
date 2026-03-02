/**
 * @fileoverview Feature modules for database schema registration
 * @module database/modules
 * @description Provides feature-scoped modules for MongoDB schema registration following NestJS patterns.
 *
 * @example
 * ```typescript
 * // In your feature module
 * @Module({
 *   imports: [AuthDatabaseModule],
 *   providers: [AuthService],
 * })
 * export class AuthModule {}
 * ```
 */

export * from './auth-database.module';
