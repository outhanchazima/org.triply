/**
 * @fileoverview API authentication module
 * @module api/modules/auth
 * @description Feature module for authentication routes and controllers.
 *
 * Imports the shared AuthModule which provides all authentication services,
 * guards, strategies, and utilities.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [AuthModule],
 * })
 * export class AppModule {}
 * ```
 */

import { Module } from '@nestjs/common';
import { AuthModule as SharedAuthModule } from '@org.triply/shared';

/**
 * API Authentication Feature Module
 *
 * Routes:
 * - POST /auth/otp/send - Send OTP
 * - POST /auth/otp/verify - Verify OTP and authenticate
 * - POST /auth/refresh - Refresh JWT token
 * - POST /auth/logout - Logout user
 * - GET /auth/me - Get current user info
 */
@Module({
  imports: [SharedAuthModule],
})
export class AuthModule {}
