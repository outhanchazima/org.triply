# OrgTriply Backend

Monorepo backend for Triply, built with NestJS and Nx.

## Workspace Overview

| Project               | Type | Purpose                                                                  |
| --------------------- | ---- | ------------------------------------------------------------------------ |
| `triply.api`          | app  | Main API (auth, onboarding, business, admin, audit, flights, files)      |
| `triply.payments`     | app  | Secondary payments service (currently minimal scaffold)                  |
| `shared`              | lib  | Auth guards/decorators, CASL, mail, audit, file upload, common utilities |
| `database`            | lib  | Mongo/Postgres/Redis integration, schemas, repositories                  |
| `amadeus`             | lib  | Amadeus travel API client                                                |
| `triply.api-e2e`      | e2e  | End-to-end tests for `triply.api`                                        |
| `triply.payments-e2e` | e2e  | End-to-end tests for `triply.payments`                                   |

## Quick Start

```bash
npm install
cp .env.example .env
npm run start:triply.api:dev
```

Main API:

- Base URL: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs` (sandbox mode)

## Core Capabilities

- Passwordless auth: OTP + Google OAuth
- JWT access/refresh tokens with rotation
- Session/device management endpoints
- Multi-business context switching
- Business onboarding + KYC workflow
- Business role templates and member permission overrides
- High-risk approval workflows (auto-approve or second-approval)
- System admin dual-control operations
- Audit logging + audit analytics endpoints
- File upload module with pluggable storage providers

## Common Commands

### Run

```bash
npm run start:triply.api:dev
npm run start:triply.payments:dev
npm run start:all
```

### Build

```bash
npm run build:triply.api
npm run build:triply.api:prod
npm run build:triply.payments
npm run build:all
```

### Test

```bash
npm run test:triply.api
npm run test:triply.payments
npm run e2e:triply.api
npm run test:all
```

### Quality

```bash
npm run lint:triply.api
npm run lint:triply.payments
npm run lint:all
npm run format:check
```

### Seed Approval Policies

```bash
npm run seed:approval-policies:dry-run
npm run seed:approval-policies -- --force
```

## Documentation

All technical docs are under [`docs/`](./docs/README.md).

- [Architecture Overview](./docs/architecture/overview.md)
- [Project Structure](./docs/architecture/project-structure.md)
- [Dependency Graph](./docs/architecture/dependency-graph.md)
- [Installation](./docs/getting-started/installation.md)
- [Configuration](./docs/getting-started/configuration.md)
- [Triply API Reference](./docs/api/triply-api.md)
- [Approval Workflows Guide](./docs/guides/approval-workflows.md)
- [Database Library](./docs/libraries/database.md)
- [Shared Library](./docs/libraries/shared.md)
- [Amadeus Library](./docs/libraries/amadeus.md)

## Contributing

- [Contributing Guide](./docs/guides/contributing.md)
- [Testing Guide](./docs/guides/testing.md)
- [Deployment Guide](./docs/guides/deployment.md)
- [Project CONTRIBUTING.md](./CONTRIBUTING.md)
