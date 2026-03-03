# @org.triply/database

Multi-database NestJS library for the OrgTriply backend monorepo. Provides unified abstractions and implementations for PostgreSQL (TypeORM), MongoDB (Mongoose), and Redis (ioredis) connections, with advanced query filtering, repository patterns, and connection management.

## Overview

The database library offers:

- **Multi-database support**: PostgreSQL, MongoDB, and Redis
- **Unified repository pattern**: Base implementations for both SQL and NoSQL databases
- **Advanced query filtering**: Django REST Framework-inspired filter backends
- **Health monitoring**: Database connection health checks and diagnostics
- **Query optimization**: Performance monitoring and optimization services
- **Connection management**: Centralized connection pooling and lifecycle management

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@org.triply/database';

@Module({
  imports: [
    DatabaseModule.forRoot({
      postgres: [
        {
          name: 'main',
          host: 'localhost',
          database: 'mydb',
          username: 'user',
          password: 'password',
        },
      ],
      mongodb: [
        {
          name: 'docs',
          uri: 'mongodb://localhost/docs',
        },
      ],
      redis: [
        {
          name: 'cache',
          host: 'localhost',
          port: 6379,
        },
      ],
      enableHealthCheck: true,
      enablePerformanceMonitoring: true,
    }),
  ],
})
export class AppModule {}
```

## Project Structure

```
libs/database/src/lib/
├── database.module.ts           # Main dynamic NestJS module
├── database.constants.ts        # Configuration tokens and constants
├── interfaces/
│   └── database.interface.ts    # Type definitions and configuration interfaces
├── services/
│   ├── database.service.ts      # Main orchestrator service
│   ├── postgres.service.ts      # PostgreSQL-specific operations
│   ├── mongo.service.ts         # MongoDB-specific operations
│   ├── redis.service.ts         # Redis-specific operations
│   ├── connection-manager.service.ts  # Connection pooling & lifecycle
│   ├── query-optimization.service.ts  # Query performance monitoring
│   └── database-health.service.ts     # Health checks & diagnostics
├── repositories/
│   ├── base-postgres.repository.ts    # Abstract base for SQL repositories
│   ├── base-mongo.repository.ts       # Abstract base for NoSQL repositories
│   ├── user.repository.ts             # User entity operations
│   ├── business.repository.ts         # Business entity operations
│   ├── business-membership.repository.ts
│   ├── traveller-profile.repository.ts
│   ├── system-user-profile.repository.ts
│   ├── refresh-token.repository.ts
│   └── audit-log.repository.ts
├── schemas/
│   ├── enums.ts                 # Enum definitions
│   ├── user.schema.ts           # User MongoDB schema
│   ├── business.schema.ts       # Business MongoDB schema
│   ├── refresh-token.schema.ts
│   ├── traveller-profile.schema.ts
│   ├── system-user-profile.schema.ts
│   ├── business-membership.schema.ts
│   └── audit-log.schema.ts
├── filters/
│   ├── query-filter.backend.ts  # DRF-inspired filter backend implementations
│   └── filterset.ts             # Filter set configuration
├── decorators/
│   ├── query-filters.decorator.ts  # @QueryFilters parameter decorator
│   └── api-filters.decorator.ts    # @ApiFilters documentation decorator
├── interceptors/
│   └── query-filter.interceptor.ts # Query filter request interceptor
├── dtos/
│   └── auth.dto.ts              # Authentication-related DTOs
└── utils/
    ├── query-filter.parser.ts   # Parse query strings to QueryOptions
    └── pipeline.builder.ts      # Build MongoDB aggregation pipelines
```

## Key Components

### DatabaseModule

The main NestJS dynamic module that configures database connections and services.

**Features:**

- Dynamic configuration via `forRoot()` or `forRootAsync()`
- Feature-scoped module setup via `forFeature()`
- Automatic health checks and performance monitoring
- Connection pooling and lifecycle management

### Repository Pattern

Base repository implementations provide common CRUD operations and querying capabilities for both SQL and NoSQL databases.

```typescript
import { BasePostgresRepository, BaseMongoRepository, UserRepository } from '@org.triply/database';

// PostgreSQL repository
const pgRepo = new UserRepository(queryRunner);
const users = await pgRepo.find({ where: { role: 'admin' } });

// MongoDB repository
const mongoRepo = new UserRepository(model);
const travellers = await mongoRepo.find({ filters: { type: 'traveller' } });
```

### Query Filtering System

Advanced query filtering inspired by Django REST Framework patterns.

```typescript
import { QueryFilters, QueryFilterInterceptor, QueryFilterBackend } from '@org.triply/database';

@Controller('users')
@UseInterceptors(QueryFilterInterceptor)
export class UserController {
  @Get()
  async getUsers(@QueryFilters() filters: QueryOptions) {
    // filters contains: search, filtering, ordering, pagination
    return await this.userService.find(filters);
  }
}
```

### Connection Management

Centralized connection management with health monitoring and optimization.

```typescript
import { DatabaseService, ConnectionManagerService } from '@org.triply/database';

constructor(
  private readonly dbService: DatabaseService,
  private readonly connMgr: ConnectionManagerService,
) {}

async checkHealth() {
  const status = await this.connMgr.getConnectionStatus();
  return status; // { postgres: 'healthy', mongodb: 'healthy', redis: 'connected' }
}
```

## Barrel Exports

Each folder provides barrel exports for convenient importing:

```typescript
// Services
import { DatabaseService, PostgresService } from '@org.triply/database/services';

// Repositories
import { BasePostgresRepository, UserRepository } from '@org.triply/database/repositories';

// Schemas
import { User, UserDocument } from '@org.triply/database/schemas';

// Filters
import { QueryFilterBackend, FilterSet } from '@org.triply/database/filters';

// Utils
import { QueryFilterParser, PipelineBuilder } from '@org.triply/database/utils';
```

Or import from the main entry point:

```typescript
import { DatabaseModule, DatabaseService, UserRepository, QueryFilterInterceptor } from '@org.triply/database';
```

## Building and Testing

```bash
# Build the library
nx build database

# Run unit tests
nx test database

# Run linter
nx lint database

# Build with dependencies
nx run database:build --with-deps
```

## Approval Workflow Seed Data

Seed initial approval workflow policies (system + business defaults):

```bash
npm run seed:approval-policies
```

Preview only (no writes):

```bash
npm run seed:approval-policies:dry-run
```

Optional flags:

- `--force`
- `--system-only`
- `--actor-email=<email>`

## Contributing

When adding new features to this library:

1. **Create feature-specific folders** under `libs/database/src/lib/`
2. **Add barrel exports** with `index.ts` in each folder
3. **Document exports** in the root [index.ts](src/index.ts)
4. **Export from module** in [database.module.ts](src/lib/database.module.ts) if applicable
5. **Update this README** with new components and examples

## Best Practices

1. **Use typed queries**: Leverage TypeScript types for compile-time safety
2. **Leverage base classes**: Extend `BasePostgresRepository` or `BaseMongoRepository`
3. **Use filters for querying**: Apply `QueryFilterBackend` for flexible filtering
4. **Monitor performance**: Use `QueryOptimizationService` for slow query detection
5. **Handle connections gracefully**: Respect NestJS lifecycle hooks (OnModuleInit, OnModuleDestroy)

## Related Documentation

- [Architecture overview](../../docs/architecture/overview.md)
- [Database configuration guide](../../docs/getting-started/configuration.md)
- [Shared library documentation](../shared/README.md)
