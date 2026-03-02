/**
 * @fileoverview Authentication module
 * @module shared/auth
 * @description Provides authentication services, strategies, guards, and decorators
 * for the application. Integrates with the database layer to manage user sessions,
 * authentication tokens, and permission checks.
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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthDatabaseModule } from '@org.triply/database';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { AuthService } from './services/auth.service';
import { EncryptionService } from './services/encryption.service';
import { JwtStrategy, GoogleStrategy } from './strategies';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';

/**
 * Authentication Module
 *
 * Provides:
 * - JWT-based authentication
 * - OAuth strategies (Google, etc.)
 * - CASL-based authorization
 * - Role and permission guards
 * - Auth decorators and utilities
 *
 * Requires:
 * - AuthDatabaseModule for user and token entities
 */
@Module({
  imports: [
    AuthDatabaseModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>(
            'JWT_EXPIRES_IN',
            '15m',
          ) as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    AuditModule,
    MailModule,
  ],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, EncryptionService, JwtStrategy, GoogleStrategy],
  exports: [
    AuthService,
    EncryptionService,
    JwtModule,
    PassportModule,
    AuditModule,
    MailModule,
  ],
})
export class AuthModule {}
