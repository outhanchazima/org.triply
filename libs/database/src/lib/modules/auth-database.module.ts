/**
 * @fileoverview Authentication database module
 * @module database/modules/auth-database
 * @description Feature module for registering authentication-related MongoDB schemas
 * and providing repositories.
 *
 * **What This Module Does:**
 *
 * Registers the following MongoDB schemas via MongooseModule.forFeature():
 * - User - Main user entity with email, password, KYC status
 * - RefreshToken - JWT refresh tokens for long-lived sessions
 * - TravellerProfile - Traveller-specific information
 * - SystemUserProfile - System admin profiles
 * - Business - Business entities
 * - BusinessMembership - User-to-business associations
 * - AuditLog - Audit trail for all operations
 *
 * Provides the following Injectable repositories:
 * - UserRepository - User CRUD and search operations
 * - RefreshTokenRepository - Token management
 * - TravellerProfileRepository - Traveller data access
 * - SystemUserProfileRepository - Admin profile access
 * - BusinessRepository - Business data access
 * - BusinessMembershipRepository - Membership operations
 * - AuditLogRepository - Audit trail access
 *
 * **Why This Pattern:**
 *
 * Each repository extends BaseMongoRepository and includes:
 * - Connection management via MongoService
 * - Type-safe document access
 * - Custom methods for domain-specific queries
 * - Optional caching and optimization
 *
 * By registering schemas in this module only, we:
 * - Keep concerns separated (schemas live in database lib)
 * - Allow lazy-loading (schemas only instantiated when needed)
 * - Enable testing (repositories can be mocked)
 * - Follow NestJS conventions
 *
 * **Usage in AuthModule:**
 *
 * ```typescript
 * @Module({
 *   imports: [AuthDatabaseModule],  // ← Brings in all auth schemas
 *   providers: [AuthService],        // Service uses injected repositories
 *   controllers: [AuthController],
 *   exports: [AuthService],
 * })
 * export class AuthModule {}
 * ```
 *
 * **Usage in AuthService:**
 *
 * ```typescript
 * @Injectable()
 * export class AuthService {
 *   constructor(
 *     private readonly userRepository: UserRepository,
 *     private readonly tokenRepository: RefreshTokenRepository,
 *   ) {}
 *
 *   async login(email: string, password: string) {
 *     const user = await this.userRepository.findByEmail(email);
 *     // ... validate password ...
 *     const token = await this.tokenRepository.create({
 *       user: user._id,
 *       expiresAt: new Date(),
 *     });
 *     return { accessToken: '...', refreshToken: token.token };
 *   }
 * }
 * ```
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
 *
 * @see {@link AuthService} - Uses repositories from this module
 * @see {@link BaseMongoRepository} - Base class for all repositories
 * @see {@link UserSchema} - User entity definition
 */

import { Module } from '@nestjs/common';

// ── Repositories ─────────────────────────────────────
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TravellerProfileRepository } from '../repositories/traveller-profile.repository';
import { SystemUserProfileRepository } from '../repositories/system-user-profile.repository';
import { BusinessRepository } from '../repositories/business.repository';
import { BusinessMembershipRepository } from '../repositories/business-membership.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

/**
 * Authentication Database Module
 *
 * **Responsibilities:**
 *
 * 1. Register all auth-related MongoDB schemas with Mongoose
 * 2. Provide instantiated repositories for accessing those entities
 * 3. Export repositories so the AuthModule and AuthService can use them
 *
 * **When to Import This:**
 *
 * Any NestJS module that needs to access user data, refresh tokens,
 * business memberships, or audit logs should import this module.
 *
 * **Do Not:**
 *
 * - Import schemas directly in feature modules (let this module handle it)
 * - Create your own repository instances (inject them via DI)
 * - Export the module from database/index.ts (users should import
 *   AuthDatabaseModule directly, not the database module)
 *
 * **Repository Dependencies:**
 *
 * All repositories depend on:
 * - `MongoService` - Manages MongoDB connections
 * - Schema definitions - Registered in imports above
 *
 * @global Not a global module. Must be explicitly imported.
 * @module AuthDatabaseModule
 */
@Module({
  imports: [],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    TravellerProfileRepository,
    SystemUserProfileRepository,
    BusinessRepository,
    BusinessMembershipRepository,
    AuditLogRepository,
  ],
  exports: [
    UserRepository,
    RefreshTokenRepository,
    TravellerProfileRepository,
    SystemUserProfileRepository,
    BusinessRepository,
    BusinessMembershipRepository,
    AuditLogRepository,
  ],
})
export class AuthDatabaseModule {}
