import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './services/database.service';
import { PostgresService } from './services/postgres.service';
import { MongoService } from './services/mongo.service';
import { RedisService } from './services/redis.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import { QueryOptimizationService } from './services/query-optimization.service';
import { DatabaseHealthService } from './services/database-health.service';
import {
  DATABASE_OPTIONS,
  POSTGRES_CONNECTIONS,
  MONGO_CONNECTIONS,
  REDIS_CONNECTIONS,
} from './database.constants';
import { DatabaseModuleOptions } from './interfaces/database.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {
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

    const imports: any[] = [ConfigModule];

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
                logging: config.logging || false,
                ssl: config.ssl,
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
          })
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
          })
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
        DatabaseService,
        PostgresService,
        MongoService,
        RedisService,
        ConnectionManagerService,
        QueryOptimizationService,
        DatabaseHealthService,
        DATABASE_OPTIONS,
        POSTGRES_CONNECTIONS,
        MONGO_CONNECTIONS,
        REDIS_CONNECTIONS,
      ],
    };
  }

  static forFeature(options: {
    postgres?: string[];
    mongodb?: string[];
    redis?: string[];
  }): DynamicModule {
    const providers: Provider[] = [];
    const imports: any[] = [];

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
        typeof p === 'object' && 'provide' in p ? p.provide : p
      ),
    };
  }
}
