import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  BusinessContextGuard,
  SystemUserGuard,
} from './auth/guards';
import { CaslAbilityFactory, PoliciesGuard } from './auth/casl';
import { AuthModule } from './auth/auth.module';

// Common infrastructure
import { AllExceptionsFilter, HttpExceptionFilter } from './common/filters';
import {
  LoggingInterceptor,
  ResponseTransformInterceptor,
} from './common/interceptors';
import { AuditInterceptor } from './audit/interceptors';
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
} from './common/middleware';

// Utils
import { RequestService } from './utils/services';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ThrottlerModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
    // Services
    RequestService,
    CaslAbilityFactory,

    // Interceptors (LoggingInterceptor and ResponseTransformInterceptor are registered globally in AppModule)
    LoggingInterceptor,
    ResponseTransformInterceptor,
    AuditInterceptor,

    // Filters
    AllExceptionsFilter,
    HttpExceptionFilter,

    // Middleware
    CorrelationIdMiddleware,
    RequestLoggerMiddleware,

    // Guards (not provided globally, but available for injection)
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    BusinessContextGuard,
    SystemUserGuard,
    PoliciesGuard,
  ],
  exports: [
    AuthModule,
    RequestService,
    HttpModule,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    BusinessContextGuard,
    SystemUserGuard,
    PoliciesGuard,
    LoggingInterceptor,
    ResponseTransformInterceptor,
    AuditInterceptor,
    AllExceptionsFilter,
    HttpExceptionFilter,
    CorrelationIdMiddleware,
    RequestLoggerMiddleware,
    CaslAbilityFactory,
  ],
})
export class SharedModule {}
