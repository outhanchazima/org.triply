import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule, validate } from '@org.triply/shared';
import { appConfig } from './config/app.config';
import { FlightsModule } from './modules/flights/flights.module';

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
    HealthModule,

    // ── Feature Modules ──────────────────────────────────
    FlightsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
