# Dependency Graph

## Package Dependencies

The monorepo contains four libraries and one application. Dependencies flow **downward** — apps depend on libs, and libs may depend on other libs.

```
                        ┌──────────────────┐
                        │   triply.api     │
                        │   (application)  │
                        └──┬──────┬────────┘
                           │      │
               ┌───────────┘      └───────────┐
               ▼                              ▼
      ┌────────────────┐            ┌─────────────────┐
      │   @org.triply/ │            │   @org.triply/   │
      │    amadeus     │            │     shared       │
      │    (lib)       │            │     (lib)        │
      └────────────────┘            └────────┬────────┘
                                             │
                                    ┌────────┘
                                    ▼
                           ┌─────────────────┐
                           │   @org.triply/   │
                           │    database     │
                           │    (lib)        │
                           └─────────────────┘

      ┌────────────────┐
      │   @org.triply/ │   (standalone, no internal deps)
      │     utils      │
      │    (lib)       │
      └────────────────┘
```

## Detailed Import Map

### `triply.api` imports

| Import                | Used For                                                       |
| --------------------- | -------------------------------------------------------------- |
| `@org.triply/amadeus` | `AmadeusModule`, `AmadeusClient` — flight search               |
| `@org.triply/shared`  | `HealthModule`, `validate`, `createAppConfig`, `baseEnvSchema` |

### `@org.triply/amadeus` imports

| Import           | Used For                                 |
| ---------------- | ---------------------------------------- |
| `@nestjs/axios`  | `HttpModule`, `HttpService` — HTTP calls |
| `@nestjs/config` | `ConfigService` — API keys, base URL     |

### `@org.triply/shared` imports

| Import           | Used For                               |
| ---------------- | -------------------------------------- |
| `@nestjs/axios`  | `HttpModule` — powers `RequestService` |
| `@nestjs/config` | `ConfigModule`, `ConfigService`        |
| `arkenv`         | Runtime environment validation         |
| `qs`             | Query string serialisation             |
| `form-data`      | Multipart form encoding                |

### `@org.triply/database` imports

| Import           | Used For                                  |
| ---------------- | ----------------------------------------- |
| `typeorm`        | PostgreSQL ORM, QueryRunner, Repository   |
| `mongoose`       | MongoDB ODM, Schema, Model, ClientSession |
| `ioredis`        | Redis client for caching and pub/sub      |
| `uuid`           | Unique ID generation                      |
| `@nestjs/common` | NestJS decorators, Injectable, Logger     |

### `@org.triply/utils`

No internal or significant external dependencies currently.

## Data Flow

### Flight Search Flow

```
Client
  │
  │  GET /api/v1/flights/search?origin=JFK&destination=LAX&date=2026-06-15
  │
  ▼
FlightsController (triply.api)
  │  Validates SearchFlightsDto
  ▼
FlightsService (triply.api)
  │  Calls amadeus.shopping.flightOffersSearch.get()
  ▼
AmadeusClient (@org.triply/amadeus)
  │  OAuth2 token management
  │  HTTP POST to Amadeus API
  ▼
Amadeus REST API (external)
  │
  ▼
Response ← FlightsController ← Client
```

### Database Query Flow (future modules)

```
Controller
  │  Receives request + query params
  ▼
QueryFilterInterceptor
  │  Parses ?filter=, ?search=, ?ordering=, ?page=
  │  Attaches QueryOptions to request.drfFilters
  ▼
Service
  │  Receives QueryOptions
  ▼
BasePostgresRepository / BaseMongoRepository
  │  Delegates to PostgresService / MongoService
  ▼
TypeORM QueryBuilder / Mongoose Query
  │
  ▼
PostgreSQL / MongoDB
```

## Nx Task Pipeline

```
build
  └─ depends on → ^build (build dependencies first)

test
  └─ depends on → ^build (build libs before testing)

lint
  └─ independent (runs in parallel)

typecheck
  └─ independent (runs in parallel)
```

Run `npx nx graph` to see the live interactive dependency graph.

## Next Steps

- [Architecture Overview →](./overview.md)
- [Installation →](../getting-started/installation.md)
