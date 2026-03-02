/**
 * @fileoverview Core NestJS dynamic module for multi-database support
 * @module database/module
 * @description Provides the `DatabaseModule` — a global, dynamic NestJS module
 * that orchestrates PostgreSQL (TypeORM), MongoDB (Mongoose), and Redis (ioredis)
 * connections. Supports both synchronous (`forRoot`) and asynchronous
 * (`forRootAsync`) configuration, as well as feature-scoped registration
 * (`forFeature`) for injecting connection-specific repositories, models, or
 * clients into individual feature modules.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * // ── Synchronous (static) configuration ────────────
 * @Module({
 *   imports: [
 *     DatabaseModule.forRoot({
 *       postgres: [{ name: 'main', host: 'localhost', database: 'mydb' }],
 *       mongodb:  [{ name: 'docs', uri: 'mongodb://localhost/docs' }],
 *       redis:    [{ name: 'cache', host: 'localhost' }],
 *       enableHealthCheck: true,
 *       enablePerformanceMonitoring: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // ── Async configuration (e.g. from ConfigService) ─
 * @Module({
 *   imports: [
 *     DatabaseModule.forRootAsync({
 *       imports: [ConfigModule],
 *       inject:  [ConfigService],
 *       useFactory: (cfg: ConfigService) => ({
 *         postgres: [{ name: 'main', host: cfg.get('DB_HOST') }],
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // ── Feature-scoped registration ───────────────────
 * @Module({
 *   imports: [
 *     DatabaseModule.forFeature({ postgres: ['main'], redis: ['cache'] }),
 *   ],
 * })
 * export class UserModule {}
 * ```
 */

import {
  DynamicModule,
  Global,
  Module,
  Provider,
  Type,
  ModuleMetadata,
} from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

// ── Services ──────────────────────────────────────────
import { DatabaseService } from './services/database.service';
import { PostgresService } from './services/postgres.service';
import { MongoService } from './services/mongo.service';
import { RedisService } from './services/redis.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import { QueryOptimizationService } from './services/query-optimization.service';
import { DatabaseHealthService } from './services/database-health.service';

// ── Constants ─────────────────────────────────────────
import {
  DATABASE_OPTIONS,
  POSTGRES_CONNECTIONS,
  MONGO_CONNECTIONS,
  REDIS_CONNECTIONS,
} from './database.constants';

// ── Interfaces & Types ────────────────────────────────
import { DatabaseModuleOptions } from './interfaces/database.interface';

/**
 * Async options factory for {@link DatabaseModule.forRootAsync}.
 *
 * @interface DatabaseModuleAsyncOptions
 * @description Allows database configuration to be resolved asynchronously,
 * e.g. when values come from `ConfigService`, a remote vault, or any other
 * async provider.
 *
 * @example
 * ```typescript
 * const asyncOpts: DatabaseModuleAsyncOptions = {
 *   imports: [ConfigModule],
 *   inject:  [ConfigService],
 *   useFactory: async (config: ConfigService) => ({
 *     postgres: [{
 *       name: 'main',
 *       host: config.getOrThrow('DB_HOST'),
 *       port: config.get('DB_PORT', 5432),
 *       database: config.getOrThrow('DB_NAME'),
 *       username: config.getOrThrow('DB_USERNAME'),
 *       password: config.getOrThrow('DB_PASSWORD'),
 *     }],
 *   }),
 * };
 * ```
 */
export interface DatabaseModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  /**
   * Factory function that returns (or resolves to) the
   * {@link DatabaseModuleOptions} configuration object.
   *
   * @param args - Injected providers listed in {@link inject}.
   * @returns The database configuration, synchronously or as a `Promise`.
   */
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => DatabaseModuleOptions | Promise<DatabaseModuleOptions>;

  /**
   * Optional array of providers to inject into {@link useFactory}.
   * Typically includes tokens like `ConfigService`.
   */
  inject?: (string | symbol | Type<unknown>)[];
}

/**
 * Global database module providing multi-database connectivity.
 *
 * @class DatabaseModule
 * @description Registers and manages PostgreSQL, MongoDB, and Redis
 * connections along with supporting services for health monitoring,
 * query optimization, and connection management.
 *
 * Being decorated with `@Global()`, the module's exported providers are
 * available application-wide without needing to re-import the module
 * in every feature module.
 *
 * The module exposes three static registration methods:
 *
 * | Method           | Use-case                                          |
 * |------------------|---------------------------------------------------|
 * | `forRoot()`      | Synchronous configuration (e.g. hard-coded opts)  |
 * | `forRootAsync()` | Async configuration (e.g. via `ConfigService`)     |
 * | `forFeature()`   | Inject connection-specific repos/models/clients    |
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Core Services
    DatabaseService,
    PostgresService,
    MongoService,
    RedisService,
    ConnectionManagerService,
    QueryOptimizationService,
    DatabaseHealthService,
  ],
  exports: [
    // Core Services
    DatabaseService,
    PostgresService,
    MongoService,
    RedisService,
    ConnectionManagerService,
    QueryOptimizationService,
    DatabaseHealthService,
  ],
})
export class DatabaseModule {
  /**
   * Register the database module with **synchronous** (static) configuration.
   *
   * Call this in your root `AppModule` to initialise all database connections
   * at application startup.
   *
   * @param options - Complete database configuration including connection
   *   details for PostgreSQL, MongoDB, and/or Redis, plus optional flags
   *   for health-checking and performance monitoring.
   * @returns A fully-configured {@link DynamicModule}.
   *
   * @example
   * ```typescript
   * DatabaseModule.forRoot({
   *   postgres: [
   *     { name: 'main', host: 'localhost', port: 5432, database: 'mydb' },
   *   ],
   *   enableHealthCheck: true,
   *   enablePerformanceMonitoring: true,
   * });
   * ```
   */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DATABASE_OPTIONS,
        useValue: options,
      },
      DatabaseService,
      ConnectionManagerService,
      QueryOptimizationService,
      DatabaseHealthService,
      PostgresService,
      MongoService,
      RedisService,
    ];

    const imports: DynamicModule['imports'] = [ConfigModule];

    // Setup PostgreSQL connections
    if (options.postgres && options.postgres.length > 0) {
      const postgresConnections = options.postgres.map((config) => ({
        name: config.name,
        config: config,
      }));

      providers.push({
        provide: POSTGRES_CONNECTIONS,
        useValue: postgresConnections,
      });

      // Add TypeORM modules for each PostgreSQL connection
      options.postgres.forEach((config) => {
        imports.push(
          TypeOrmModule.forRootAsync({
            name: config.name,
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              const dbConfig: TypeOrmModuleOptions = {
                type: 'postgres',
                host: config.host || configService.get('DB_HOST'),
                port: config.port || configService.get('DB_PORT', 5432),
                username: config.username || configService.get('DB_USERNAME'),
                password: config.password || configService.get('DB_PASSWORD'),
                database: config.database || configService.get('DB_NAME'),
                entities: config.entities || [],
                synchronize: config.synchronize || false,
                logging: (config.logging ||
                  false) as import('typeorm').LoggerOptions,
                ssl: config.ssl as any,
                poolSize: config.poolSize || 10,
                extra: {
                  max: config.maxConnections || 20,
                  min: config.minConnections || 5,
                  idleTimeoutMillis: config.idleTimeout || 30000,
                  connectionTimeoutMillis: config.connectionTimeout || 2000,
                  statement_timeout: config.statementTimeout || 30000,
                  query_timeout: config.queryTimeout || 30000,
                  ...config.extra,
                },
                cache: config.cache
                  ? {
                      type: 'redis',
                      options: config.cache,
                      duration: config.cacheDuration || 60000,
                    }
                  : false,
                migrations: config.migrations || [],
                migrationsRun: config.migrationsRun || false,
                migrationsTableName: config.migrationsTableName || 'migrations',
              };
              return dbConfig;
            },
            inject: [ConfigService],
          }),
        );
      });
    }

    // Setup MongoDB connections
    if (options.mongodb && options.mongodb.length > 0) {
      const mongoConnections = options.mongodb.map((config) => ({
        name: config.name,
        config: config,
      }));

      providers.push({
        provide: MONGO_CONNECTIONS,
        useValue: mongoConnections,
      });

      // Add Mongoose modules for each MongoDB connection
      options.mongodb.forEach((config) => {
        imports.push(
          MongooseModule.forRootAsync({
            connectionName: config.name,
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
              const mongoConfig: MongooseModuleOptions = {
                uri:
                  config.uri ||
                  `mongodb://${config.host}:${config.port}/${config.database}`,
                authSource: config.authSource || 'admin',
                user: config.username || configService.get('MONGO_USERNAME'),
                pass: config.password || configService.get('MONGO_PASSWORD'),
                retryWrites: config.retryWrites !== false,
                retryReads: config.retryReads !== false,
                maxPoolSize: config.maxPoolSize || 10,
                minPoolSize: config.minPoolSize || 2,
                serverSelectionTimeoutMS: config.serverSelectionTimeout || 5000,
                socketTimeoutMS: config.socketTimeout || 45000,
                family: 4,
                ...config.options,
              };
              return mongoConfig;
            },
            inject: [ConfigService],
          }),
        );
      });
    }

    // Setup Redis connections
    if (options.redis && options.redis.length > 0) {
      const redisConnections = options.redis.map((config) => ({
        name: config.name,
        config: config,
      }));

      providers.push({
        provide: REDIS_CONNECTIONS,
        useValue: redisConnections,
      });
    }

    return {
      module: DatabaseModule,
      imports,
      providers,
      exports: [
        // Core Services
        DatabaseService,
        PostgresService,
        MongoService,
        RedisService,
        ConnectionManagerService,
        QueryOptimizationService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Register the database module with async configuration.
   *
   * Useful when the options depend on `ConfigService` or another async provider.
   *
   * @example
   * ```typescript
   * DatabaseModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     postgres: [{
   *       name: 'main',
   *       host: config.get('DB_HOST'),
   *       port: config.get('DB_PORT'),
   *       database: config.get('DB_NAME'),
   *       username: config.get('DB_USERNAME'),
   *       password: config.get('DB_PASSWORD'),
   *     }],
   *     enableHealthCheck: true,
   *     enablePerformanceMonitoring: true,
   *   }),
   * });
   * ```
   */
  static forRootAsync(asyncOptions: DatabaseModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DATABASE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject || [],
      },
      DatabaseService,
      ConnectionManagerService,
      QueryOptimizationService,
      DatabaseHealthService,
      PostgresService,
      MongoService,
      RedisService,
      {
        provide: POSTGRES_CONNECTIONS,
        useFactory: (options: DatabaseModuleOptions) =>
          (options.postgres || []).map((c) => ({ name: c.name, config: c })),
        inject: [DATABASE_OPTIONS],
      },
      {
        provide: MONGO_CONNECTIONS,
        useFactory: (options: DatabaseModuleOptions) =>
          (options.mongodb || []).map((c) => ({ name: c.name, config: c })),
        inject: [DATABASE_OPTIONS],
      },
      {
        provide: REDIS_CONNECTIONS,
        useFactory: (options: DatabaseModuleOptions) =>
          (options.redis || []).map((c) => ({ name: c.name, config: c })),
        inject: [DATABASE_OPTIONS],
      },
    ];

    return {
      module: DatabaseModule,
      imports: [ConfigModule, ...(asyncOptions.imports || [])],
      providers,
      exports: [
        // Core Services
        DatabaseService,
        PostgresService,
        MongoService,
        RedisService,
        ConnectionManagerService,
        QueryOptimizationService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Register connection-specific providers for a **feature module**.
   *
   * For each connection name you list, the module creates and exports
   * an injection token so that the corresponding repository, model, or
   * Redis client can be injected directly into the feature's services.
   *
   * | DB type    | Token pattern               | Injected value              |
   * |------------|-----------------------------|-----------------------------|
   * | PostgreSQL | `{name}_REPOSITORY`          | `Repository` from TypeORM   |
   * | MongoDB    | `{name}_MODEL`               | Mongoose `Connection`       |
   * | Redis      | `{name}_REDIS`               | `ioredis` `Redis` client    |
   *
   * @param options - Object specifying which connection names to register
   *   for each database type.
   * @returns A {@link DynamicModule} exporting the requested providers.
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     DatabaseModule.forFeature({
   *       postgres: ['main'],
   *       redis: ['cache'],
   *     }),
   *   ],
   * })
   * export class UserModule {}
   *
   * // Then inject in a service:
   * @Injectable()
   * export class UserService {
   *   constructor(
   *     @Inject('main_REPOSITORY') private readonly repo: Repository<User>,
   *     @Inject('cache_REDIS') private readonly redis: Redis,
   *   ) {}
   * }
   * ```
   */
  static forFeature(options: {
    postgres?: string[];
    mongodb?: string[];
    redis?: string[];
  }): DynamicModule {
    const providers: Provider[] = [];
    const imports: DynamicModule['imports'] = [];

    // Register PostgreSQL repositories for specific connections
    if (options.postgres) {
      options.postgres.forEach((connectionName) => {
        providers.push({
          provide: `${connectionName}_REPOSITORY`,
          useFactory: (postgresService: PostgresService) => {
            return postgresService.getRepository(connectionName);
          },
          inject: [PostgresService],
        });
      });
    }

    // Register MongoDB models for specific connections
    if (options.mongodb) {
      options.mongodb.forEach((connectionName) => {
        providers.push({
          provide: `${connectionName}_MODEL`,
          useFactory: (mongoService: MongoService) => {
            return mongoService.getConnection(connectionName);
          },
          inject: [MongoService],
        });
      });
    }

    // Register Redis clients for specific connections
    if (options.redis) {
      options.redis.forEach((connectionName) => {
        providers.push({
          provide: `${connectionName}_REDIS`,
          useFactory: (redisService: RedisService) => {
            return redisService.getClient(connectionName);
          },
          inject: [RedisService],
        });
      });
    }

    return {
      module: DatabaseModule,
      imports,
      providers,
      exports: providers.map((p) =>
        typeof p === 'object' && 'provide' in p ? p.provide : p,
      ),
    };
  }
}
