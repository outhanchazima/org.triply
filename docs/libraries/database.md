# Database Library (`@org.triply/database`)

## Overview

Enterprise-grade database abstraction layer providing unified access to **PostgreSQL**, **MongoDB**, and **Redis**. Features include connection pooling, generic repository pattern, Django REST Framework-inspired query filtering, distributed transactions, query performance monitoring, and health checks with automatic recovery.

**Import:** `@org.triply/database`

## Quick Start

```typescript
import { DatabaseModule } from '@org.triply/database';

@Module({
  imports: [
    DatabaseModule.forRoot({
      postgres: {
        connections: [
          {
            name: 'main',
            type: 'postgres',
            url: process.env.DATABASE_URL,
          },
        ],
      },
      mongo: {
        connections: [
          {
            name: 'main',
            uri: process.env.MONGODB_URI,
          },
        ],
      },
      redis: {
        connections: [
          {
            name: 'cache',
            url: process.env.REDIS_URL,
          },
        ],
      },
    }),
  ],
})
export class AppModule {}
```

## Architecture

```
DatabaseModule (forRoot / forFeature)
  │
  ├── DatabaseService              ← Main orchestrator
  │     ├── PostgresService        ← TypeORM operations
  │     ├── MongoService           ← Mongoose operations
  │     └── RedisService           ← ioredis operations
  │
  ├── ConnectionManagerService     ← Connection lifecycle & pooling
  ├── QueryOptimizationService     ← Performance monitoring
  ├── DatabaseHealthService        ← Health checks & recovery
  │
  ├── BasePostgresRepository<T>    ← Generic TypeORM repository
  └── BaseMongoRepository<T>       ← Generic Mongoose repository
```

## Services

### DatabaseService

Main orchestrator that delegates to database-specific services.

```typescript
import { DatabaseService } from '@org.triply/database';

@Injectable()
export class MyService {
  constructor(private readonly db: DatabaseService) {}
}
```

### PostgresService

Full PostgreSQL support via TypeORM.

**Key Methods:**

| Method              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `find()`            | Query with filtering, sorting, pagination, search |
| `findOne()`         | Find single entity by filter                      |
| `create()`          | Insert a new entity                               |
| `createMany()`      | Bulk insert                                       |
| `update()`          | Update entity by ID                               |
| `updateMany()`      | Update multiple entities by filter                |
| `delete()`          | Delete entity by ID                               |
| `deleteMany()`      | Delete multiple entities by filter                |
| `count()`           | Count matching entities                           |
| `aggregate()`       | Aggregation (groupBy, sum, avg, min, max, count)  |
| `transaction()`     | Execute callback in a transaction                 |
| `executeRawQuery()` | Raw SQL execution                                 |

### MongoService

Full MongoDB support via Mongoose.

**Key Methods:**

| Method                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `find()`               | Query with filtering, sorting, pagination |
| `findOne()`            | Find single document by filter            |
| `create()`             | Insert a new document                     |
| `createMany()`         | Bulk insert                               |
| `update()`             | Update document by ID                     |
| `updateMany()`         | Update multiple documents by filter       |
| `delete()`             | Delete document by ID                     |
| `count()`              | Count matching documents                  |
| `exists()`             | Check if documents exist                  |
| `aggregate()`          | Structured aggregation                    |
| `executeAggregation()` | Raw aggregation pipeline                  |
| `search()`             | Full-text search with relevance scoring   |
| `transaction()`        | Execute callback in a session transaction |
| `createIndexes()`      | Create collection indexes                 |
| `getModel()`           | Get underlying Mongoose model             |

### RedisService

Redis caching and data structure operations via ioredis.

**Key Methods:**

| Method                      | Description                |
| --------------------------- | -------------------------- |
| `get()` / `set()`           | Basic key-value operations |
| `del()`                     | Delete keys                |
| `exists()`                  | Check key existence        |
| `expire()`                  | Set TTL on keys            |
| `hget()` / `hset()`         | Hash operations            |
| `lpush()` / `rpush()`       | List operations            |
| `sadd()` / `smembers()`     | Set operations             |
| `zadd()` / `zrange()`       | Sorted set operations      |
| `publish()` / `subscribe()` | Pub/sub messaging          |
| `multi()`                   | Transaction pipelines      |

### ConnectionManagerService

Manages the lifecycle of all database connections.

**Features:**

- Connection creation and teardown
- Connection pool monitoring and metrics
- Multi-database routing
- Distributed transaction coordination across databases

### QueryOptimizationService

Monitors query performance and provides optimisation suggestions.

**Features:**

- Automatic slow-query detection (configurable thresholds)
- Query pattern analysis and statistics
- Heuristic optimisation suggestions (missing indexes, N+1 detection)
- Performance report export

```typescript
// Enable monitoring
optimizationService.enableMonitoring();

// Get statistics
const stats = optimizationService.getStatistics();

// Get suggestions
const suggestions = optimizationService.getOptimizationSuggestions();

// Export report
const report = optimizationService.exportPerformanceReport();
```

### DatabaseHealthService

Continuous health monitoring with automatic recovery.

**Features:**

- Periodic health checks for all connections
- Per-connection status tracking (healthy, degraded, unhealthy)
- Automatic recovery attempts for failed connections
- Health report export

```typescript
// Start monitoring (runs on interval)
healthService.startMonitoring();

// Manual health check
const result = await healthService.checkHealth();

// Export report
const report = healthService.exportHealthReport();
```

## Repositories

### BasePostgresRepository\<T\>

Generic repository for PostgreSQL entities. Extend this class to create entity-specific repositories.

```typescript
import { Injectable } from '@nestjs/common';
import { BasePostgresRepository } from '@org.triply/database';
import { UserEntity } from './user.entity';

@Injectable()
export class UserRepository extends BasePostgresRepository<UserEntity> {
  constructor(postgresService: PostgresService) {
    super(postgresService, 'main', UserEntity);
  }
}
```

**Available Methods:**

| Category        | Methods                                                        |
| --------------- | -------------------------------------------------------------- |
| **Read**        | `findOne()`, `findMany()`, `count()`, `exists()`, `distinct()` |
| **Create**      | `create()`, `createMany()`                                     |
| **Update**      | `update()`, `updateMany()`, `increment()`, `decrement()`       |
| **Delete**      | `delete()`, `deleteMany()`, `softDelete()`, `restore()`        |
| **Upsert**      | `findOrCreate()`, `upsert()`, `bulkUpsert()`                   |
| **Search**      | `search()` (full-text or field-based)                          |
| **Aggregation** | `aggregate()` (groupBy, sum, avg, min, max)                    |
| **Transaction** | `transaction()` (callback-based)                               |
| **Batch**       | `batchProcess()`, `stream()` (async generator)                 |
| **Raw**         | `raw()`, `getQueryBuilder()`                                   |

### BaseMongoRepository\<T\>

Generic repository for MongoDB documents with all the same methods as `BasePostgresRepository`, plus MongoDB-specific operations:

| Method                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `aggregatePipeline()`     | Execute raw MongoDB aggregation pipeline |
| `createPipelineBuilder()` | Fluent aggregation pipeline builder      |
| `getModel()`              | Access underlying Mongoose model         |
| `createTextIndex()`       | Create text index for `$text` search     |
| `createCompoundIndex()`   | Create compound index                    |
| `dropIndex()`             | Drop a named index                       |
| `getIndexes()`            | List all collection indexes              |
| `push()`                  | Push to array field (`$push`)            |
| `pull()`                  | Remove from array field (`$pull`)        |
| `addToSet()`              | Add unique values to array (`$addToSet`) |

## Query Filtering System

Inspired by Django REST Framework, the query filtering system allows declarative, URL-driven filtering.

### Filter Backends

| Backend                  | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `MainQueryFilterBackend` | Full filtering, search, ordering, pagination |
| `SearchFilterBackend`    | Text search only                             |
| `OrderingFilterBackend`  | Field ordering only                          |
| `CompositeFilterBackend` | Chains multiple backends                     |

### Usage with Decorators

```typescript
import { QueryFilters, QueryFilterInterceptor, DRFRequest } from '@org.triply/database';

@Controller('users')
@UseInterceptors(QueryFilterInterceptor)
export class UsersController {
  @Get()
  @QueryFilters({
    searchFields: ['name', 'email'],
    orderingFields: ['createdAt', 'name'],
    filterFields: { status: ['exact', 'in'], role: ['exact'] },
  })
  findAll(@Req() req: DRFRequest) {
    return this.service.findAll(req.drfFilters);
  }
}
```

### Query String Syntax

```
# Filtering (Django-style lookups)
?status=active                    # exact match
?age__gte=18                      # greater than or equal
?name__icontains=john             # case-insensitive contains
?role__in=admin,editor            # in list

# Search
?search=john doe                  # full-text search across configured fields

# Ordering
?ordering=name                    # ascending
?ordering=-createdAt              # descending
?ordering=name,-createdAt         # multiple fields

# Pagination
?page=2&page_size=25              # page-based pagination
```

### Supported Lookup Types

| Lookup      | Operator    | Example                      |
| ----------- | ----------- | ---------------------------- |
| `exact`     | `eq`        | `?status=active`             |
| `iexact`    | `eq` (CI)   | `?name__iexact=john`         |
| `contains`  | `like`      | `?name__contains=oh`         |
| `icontains` | `like` (CI) | `?name__icontains=oh`        |
| `gt`        | `gt`        | `?age__gt=18`                |
| `gte`       | `gte`       | `?age__gte=18`               |
| `lt`        | `lt`        | `?price__lt=100`             |
| `lte`       | `lte`       | `?price__lte=100`            |
| `in`        | `in`        | `?status__in=active,pending` |
| `isnull`    | `isNull`    | `?deletedAt__isnull=true`    |
| `regex`     | `regex`     | `?code__regex=^AB`           |
| `iregex`    | `regex`(CI) | `?code__iregex=^ab`          |

### PipelineBuilder

Fluent API for building MongoDB aggregation pipelines:

```typescript
const builder = new PipelineBuilder()
  .match({ status: 'active' })
  .group({ _id: '$category', total: { $sum: '$amount' } })
  .sort({ total: -1 })
  .limit(10);

const results = await repo.aggregatePipeline(builder.build());
```

## Interfaces

### QueryOptions

```typescript
interface QueryOptions {
  filter?: FilterOptions[];
  sort?: SortOptions[];
  page?: number;
  limit?: number;
  select?: string[];
  populate?: PopulateOptions[];
  search?: SearchOptions;
  transaction?: any;
}
```

### FilterOptions

```typescript
interface FilterOptions {
  field: string;
  operator: FilterOperator;
  value: any;
  caseSensitive?: boolean;
}
```

### PaginationResult\<T\>

```typescript
interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: Record<string, any>;
}
```

## Next Steps

- [Shared Library →](./shared.md)
- [Amadeus Library →](./amadeus.md)
