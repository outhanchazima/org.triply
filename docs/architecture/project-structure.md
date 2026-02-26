# Project Structure

## Monorepo Layout

```
org.triply/
├── apps/                              # Deployable applications
│   ├── triply.api/                    # Main REST API (NestJS)
│   └── triply.api-e2e/                # End-to-end test suite
├── libs/                              # Shared libraries
│   ├── amadeus/                       # Amadeus travel API client
│   ├── database/                      # Multi-DB support (Postgres, Mongo, Redis)
│   ├── shared/                        # Cross-cutting concerns & utilities
│   └── utils/                         # Standalone utility module
├── docs/                              # Project documentation (you are here)
├── scripts/                           # Build & dev scripts
├── .github/                           # GitHub Actions & templates
│   ├── workflows/ci.yml               # CI pipeline
│   ├── ISSUE_TEMPLATE/                # Bug report & feature request templates
│   └── PULL_REQUEST_TEMPLATE/         # PR template
├── .husky/                            # Git hooks (pre-commit, commit-msg)
├── .vscode/                           # VS Code workspace settings
└── [root config files]                # See below
```

## Root Configuration Files

| File                   | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `nx.json`              | Nx workspace configuration, plugins, caching  |
| `package.json`         | Root dependencies and npm scripts             |
| `tsconfig.base.json`   | Base TypeScript config shared by all projects |
| `tsconfig.json`        | Root-level TypeScript references              |
| `eslint.config.mjs`    | ESLint flat config                            |
| `jest.config.ts`       | Jest workspace configuration                  |
| `jest.preset.js`       | Shared Jest preset                            |
| `.prettierrc`          | Prettier formatting rules                     |
| `.env.example`         | Template for environment variables            |
| `commitlint.config.js` | Conventional commit rules                     |
| `.lintstagedrc.json`   | Lint-staged hooks config                      |
| `.editorconfig`        | Editor formatting consistency                 |
| `.markdownlint.jsonc`  | Markdown linting rules                        |

## Application: `triply.api`

The main NestJS application.

```
apps/triply.api/
├── src/
│   ├── main.ts                        # Bootstrap: Helmet, CORS, Swagger, ValidationPipe
│   ├── app.module.ts                  # Root module: ConfigModule, ThrottlerModule, etc.
│   ├── config/
│   │   ├── app.config.ts              # Registers 'app' config namespace
│   │   ├── env.ts                     # arkenv schema — runtime env validation
│   │   └── index.ts                   # Barrel export
│   └── modules/
│       └── flights/                   # Flight search feature module
│           ├── flights.module.ts      # Imports AmadeusModule
│           ├── flights.controller.ts  # GET /flights/search
│           ├── flights.service.ts     # Delegates to AmadeusClient
│           └── dto/
│               └── search-flights.dto.ts  # Validated query params
├── webpack.config.js                  # Webpack build config
├── tsconfig.app.json                  # App-specific TS config
├── jest.config.ts                     # Unit test config
└── project.json                       # Nx project metadata
```

### Key Bootstrap Features (`main.ts`)

| Feature           | Implementation                             |
| ----------------- | ------------------------------------------ |
| Security headers  | `helmet()`                                 |
| Compression       | `compression()` (gzip)                     |
| CORS              | Configurable origins from env              |
| Global prefix     | `/api` (excludes `/health`, `/ready`)      |
| URI versioning    | `/v{version}` (e.g. `/api/v1/flights`)     |
| Validation        | Whitelist mode, implicit transform         |
| Swagger           | Auto-generated OpenAPI docs at `/api/docs` |
| Graceful shutdown | `enableShutdownHooks()`                    |

## Library: `libs/amadeus`

Custom Amadeus API client wrapping `@nestjs/axios`.

```
libs/amadeus/src/
├── index.ts                           # Barrel export (180+ exports)
├── lib/
│   ├── amadeus.module.ts              # NestJS module (HttpModule, ConfigModule)
│   ├── services/
│   │   └── amadeus-client.service.ts  # OAuth2 token management + HTTP calls
│   ├── client/                        # Namespaced API resource classes
│   │   ├── airline/                   # Airline destinations
│   │   ├── airport/                   # Direct destinations, predictions
│   │   ├── analytics/                 # Itinerary price metrics
│   │   ├── booking/                   # Flight orders, hotel bookings
│   │   ├── e-reputation/             # Hotel sentiments
│   │   ├── location/                  # Category-rated areas
│   │   ├── media/                     # Media files
│   │   ├── ordering/                  # Transfer orders
│   │   ├── reference-data/           # Airlines, locations, hotels, POIs
│   │   ├── schedule/                  # Flight schedules
│   │   ├── shopping/                  # Flight offers, hotel offers, activities
│   │   └── travel/                    # Air traffic, predictions
│   └── types/                         # TypeScript type definitions
│       ├── access-token.ts
│       ├── errors.ts
│       ├── pagination.ts
│       ├── shared.ts
│       └── [domain-specific types]
```

## Library: `libs/database`

Enterprise-grade database abstraction layer.

```
libs/database/src/
├── index.ts                           # Barrel export (78 lines, fully documented)
├── lib/
│   ├── database.module.ts             # Dynamic NestJS module (forRoot / forFeature)
│   ├── database.constants.ts          # Injection tokens, config defaults, thresholds
│   ├── interfaces/
│   │   └── database.interface.ts      # Core types: QueryOptions, FilterOptions, etc.
│   ├── services/
│   │   ├── database.service.ts        # Main orchestrator
│   │   ├── postgres.service.ts        # PostgreSQL operations (TypeORM)
│   │   ├── mongo.service.ts           # MongoDB operations (Mongoose)
│   │   ├── redis.service.ts           # Redis caching & pub/sub (ioredis)
│   │   ├── connection-manager.service.ts  # Connection lifecycle & pooling
│   │   ├── query-optimization.service.ts  # Performance monitoring & suggestions
│   │   └── database-health.service.ts     # Health checks & recovery
│   ├── repositories/
│   │   ├── base-postgres.repository.ts    # Generic TypeORM repository
│   │   └── base-mongo.repository.ts       # Generic Mongoose repository
│   ├── filters/
│   │   ├── query-filter.backend.ts    # Django REST Framework-style filter backends
│   │   └── filterset.ts              # Declarative filter set definition
│   ├── decorators/
│   │   ├── query-filters.decorator.ts # @QueryFilters() metadata decorator
│   │   └── api-filters.decorator.ts   # Swagger filter documentation
│   ├── interceptors/
│   │   └── query-filter.interceptor.ts # Auto-applies query filtering
│   └── utils/
│       ├── query-filter.parser.ts     # Parses query string → QueryOptions
│       └── pipeline.builder.ts        # MongoDB aggregation pipeline builder
```

## Library: `libs/shared`

Cross-cutting concerns used by all apps and some libs.

```
libs/shared/src/
├── index.ts                           # Barrel export
├── lib/
│   ├── shared.module.ts               # NestJS module (exports RequestService)
│   ├── config/
│   │   ├── app.config.ts              # createAppConfig() factory
│   │   ├── env.validation.ts          # Base env schema, Environment/AppMode enums
│   │   └── index.ts
│   ├── constants/
│   │   └── index.ts                   # App-wide constants
│   ├── decorators/
│   │   ├── api-paginated-response.decorator.ts  # Swagger paginated response
│   │   ├── public.decorator.ts        # @Public() bypass auth
│   │   ├── request-id.decorator.ts    # @RequestId() param decorator
│   │   └── index.ts
│   ├── dto/
│   │   ├── pagination-query.dto.ts    # Reusable pagination DTO
│   │   └── index.ts
│   ├── filters/
│   │   ├── all-exceptions.filter.ts   # Global catch-all exception filter
│   │   ├── http-exception.filter.ts   # HTTP exception formatter
│   │   └── index.ts
│   ├── health/
│   │   ├── health.module.ts           # Health check module
│   │   ├── health.controller.ts       # GET /health, GET /ready
│   │   └── index.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts     # Request/response logging
│   │   ├── response-transform.interceptor.ts  # Standardised response envelope
│   │   ├── timeout.interceptor.ts     # Request timeout guard
│   │   └── index.ts
│   ├── interfaces/
│   │   ├── api-response.interface.ts  # Standard API response shape
│   │   └── index.ts
│   ├── middleware/
│   │   ├── correlation-id.middleware.ts  # X-Request-Id tracking
│   │   ├── request-logger.middleware.ts  # HTTP access logging
│   │   └── index.ts
│   ├── pipes/
│   │   ├── parse-optional-int.pipe.ts # Nullable integer parser
│   │   ├── trim-string.pipe.ts        # Whitespace trimmer
│   │   └── index.ts
│   ├── services/
│   │   └── request.service.ts         # HTTP client (Axios wrapper)
│   └── utils/                         # Pure utility functions
│       ├── array.util.ts              # Array helpers (chunk, unique, flatten, etc.)
│       ├── async.util.ts              # Async helpers (sleep, timeout, pool, etc.)
│       ├── cache.util.ts              # In-memory TTL cache
│       ├── code.util.ts               # Random code generators
│       ├── datetime.util.ts           # Date formatting & manipulation
│       ├── hash.util.ts               # SHA-256, token generation
│       ├── math.util.ts               # Rounding, clamping, percentages
│       ├── money.util.ts              # Currency formatting & conversion
│       ├── object.util.ts             # Deep merge, pick, omit, flatten
│       ├── pagination.util.ts         # Pagination metadata builder
│       ├── retry.util.ts              # Retry with exponential back-off
│       ├── sanitize.util.ts           # HTML stripping, SQL injection prevention
│       ├── slug.util.ts               # URL slug generation
│       ├── string.util.ts            # String manipulation helpers
│       └── index.ts                   # Barrel export
```

## Library: `libs/utils`

Minimal standalone utility module (currently a placeholder for future utilities).

```
libs/utils/src/
├── index.ts
└── lib/
    └── utils.module.ts                # Empty NestJS module
```

## File Naming Conventions

| Type        | Pattern                   | Example                        |
| ----------- | ------------------------- | ------------------------------ |
| Module      | `<name>.module.ts`        | `flights.module.ts`            |
| Controller  | `<name>.controller.ts`    | `flights.controller.ts`        |
| Service     | `<name>.service.ts`       | `flights.service.ts`           |
| Repository  | `base-<db>.repository.ts` | `base-postgres.repository.ts`  |
| DTO         | `<name>.dto.ts`           | `search-flights.dto.ts`        |
| Interface   | `<name>.interface.ts`     | `database.interface.ts`        |
| Decorator   | `<name>.decorator.ts`     | `public.decorator.ts`          |
| Filter      | `<name>.filter.ts`        | `all-exceptions.filter.ts`     |
| Interceptor | `<name>.interceptor.ts`   | `logging.interceptor.ts`       |
| Middleware  | `<name>.middleware.ts`    | `correlation-id.middleware.ts` |
| Pipe        | `<name>.pipe.ts`          | `trim-string.pipe.ts`          |
| Utility     | `<name>.util.ts`          | `retry.util.ts`                |
| Constants   | `<name>.constants.ts`     | `database.constants.ts`        |
| Unit test   | `<name>.spec.ts`          | `flights.service.spec.ts`      |
| E2E test    | `<name>.e2e-spec.ts`      | `triply.api.e2e-spec.ts`       |

## Next Steps

- [Dependency Graph →](./dependency-graph.md)
- [Architecture Overview →](./overview.md)
