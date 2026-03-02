import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@org.triply/database';

import {
  HealthModule,
  validate,
  JwtAuthGuard,
  SharedModule,
  LoggingInterceptor,
  ResponseTransformInterceptor,
  TimeoutInterceptor,
  AuditInterceptor,
} from '@org.triply/shared';
import { appConfig } from './config/app.config';
import { FlightsModule } from './modules/flights/flights.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApiAuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
      expandVariables: true,
      cache: true,
    }),

    // ── Database ─────────────────────────────────────────
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        mongodb: [
          {
            name: 'main',
            uri: cfg.getOrThrow<string>('MONGODB_URI'),
          },
        ],
      }),
    }),

    // ── Rate Limiting ────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttle.ttl', 60000),
            limit: config.get<number>('app.throttle.limit', 100),
          },
        ],
      }),
    }),

    // ── Event System ─────────────────────────────────────
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // ── Shared Modules ───────────────────────────────────
    // SharedModule includes AuthModule, MailModule, and other shared functionality
    HealthModule,
    SharedModule,

    // ── Feature Modules ──────────────────────────────────
    AuthModule,
    UsersModule,
    BusinessModule,
    OnboardingModule,
    AdminModule,
    ApiAuditModule,
    FlightsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useValue: new TimeoutInterceptor(30_000) },
  ],
})
export class AppModule {}
