# Architecture Overview

## System Design

Triply is a **travel platform backend** built as a monorepo using **NestJS** and **Nx**. The architecture follows a modular, layered design with clear separation between applications and shared libraries.

```
┌─────────────────────────────────────────────────────┐
│                    Clients                          │
│           (Web App, Mobile App, Partners)           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                  triply.api                         │
│              (NestJS Application)                   │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Flights │  │ (Future) │  │    (Future)      │   │
│  │ Module  │  │  Hotels  │  │   Bookings       │   │
│  └────┬────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼────────────┼─────────────────┼──────────────┘
        │            │                 │
┌───────▼────────────▼─────────────────▼──────────────┐
│                Shared Libraries                     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ amadeus  │  │  shared  │  │ database │          │
│  │   lib    │  │   lib    │  │   lib    │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
└───────┼──────────────┼─────────────┼────────────────┘
        │              │             │
┌───────▼──────┐ ┌─────▼─────┐ ┌────▼────────────────┐
│  Amadeus     │ │  Internal │ │  PostgreSQL          │
│  REST API    │ │  Services │ │  MongoDB   Redis     │
└──────────────┘ └───────────┘ └──────────────────────┘
```

## Technology Stack

| Layer               | Technology                                        |
| ------------------- | ------------------------------------------------- |
| **Framework**       | NestJS 11, Node.js 22                             |
| **Language**        | TypeScript 5.9                                    |
| **Build System**    | Nx 22 (monorepo, caching, task orchestration)     |
| **Relational DB**   | PostgreSQL via TypeORM                            |
| **Document DB**     | MongoDB via Mongoose 9                            |
| **Cache / Pub-Sub** | Redis via ioredis                                 |
| **Travel API**      | Amadeus Self-Service APIs (flights, hotels, etc.) |
| **Auth**            | Passport.js + JWT                                 |
| **Validation**      | class-validator + arktype (env validation)        |
| **API Docs**        | Swagger / OpenAPI via @nestjs/swagger             |
| **Queue**           | BullMQ (backed by Redis)                          |
| **Testing**         | Jest 30, @nestjs/testing                          |
| **Linting**         | ESLint 9 + Prettier                               |
| **CI/CD**           | GitHub Actions + Nx Cloud                         |

## Design Principles

### 1. Modular Monorepo

All code lives in a single Nx workspace. Feature modules are isolated in `apps/`, while reusable logic is extracted into `libs/`. Nx enforces dependency boundaries and provides incremental builds.

### 2. Layered Architecture

Each feature module follows a layered pattern:

```
Controller  →  Service  →  Repository  →  Database
     ↑            ↑            ↑
   DTOs      Interfaces    Entities / Schemas
```

- **Controllers** handle HTTP routing, validation, and Swagger decorators.
- **Services** contain business logic and orchestrate calls.
- **Repositories** abstract data access via `BasePostgresRepository` or `BaseMongoRepository`.
- **Database services** manage connections, pooling, health, and optimisation.

### 3. Configuration-Driven

All environment-specific values are validated at startup using `arkenv` (runtime type-safe env parsing) and NestJS `ConfigModule`. Two modes are supported:

| Mode        | Description                                           |
| ----------- | ----------------------------------------------------- |
| **Sandbox** | Test API keys, Swagger enabled, verbose errors        |
| **Live**    | Production API keys, Swagger disabled, minimal errors |

### 4. Convention over Configuration

- **Conventional Commits** enforced via commitlint + Husky pre-commit hooks.
- **Lint-staged** runs ESLint + Prettier on every commit.
- **Consistent naming**: kebab-case files, PascalCase classes, camelCase functions.
- **Barrel exports**: every library exposes its public API through `src/index.ts`.

### 5. Enterprise-Grade Database Layer

The `@org.triply/database` library provides:

- Multi-database support (PostgreSQL, MongoDB, Redis) with connection pooling.
- Generic repository pattern (`BasePostgresRepository`, `BaseMongoRepository`).
- Django REST Framework-inspired query filtering, search, and ordering.
- Distributed transaction support.
- Automatic query performance monitoring and optimisation suggestions.
- Health checks with automatic recovery.

### 6. Security First

- **Helmet** for HTTP security headers.
- **CORS** with configurable allowed origins.
- **Rate limiting** via `@nestjs/throttler` (global guard).
- **Input validation** with `class-validator` (whitelist mode, forbid non-whitelisted).
- **JWT-based authentication** (Passport.js).

## Request Lifecycle

```
HTTP Request
  │
  ├─ Helmet (security headers)
  ├─ Compression (gzip)
  ├─ CORS check
  ├─ Global Prefix (/api) + Versioning (/v1)
  ├─ ThrottlerGuard (rate limiting)
  ├─ ValidationPipe (DTO validation)
  ├─ Interceptors (logging, query filtering, response transform)
  ├─ Controller → Service → Repository → Database
  ├─ Exception Filters (error formatting)
  │
HTTP Response
```

## Next Steps

- [Project Structure →](./project-structure.md)
- [Dependency Graph →](./dependency-graph.md)
