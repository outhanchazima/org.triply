# Configuration

## Overview

Triply uses a **layered configuration system**:

1. **`.env` file** — environment variables loaded at startup.
2. **`arkenv` schema** (`libs/shared/src/lib/config/env.validation.ts`) — validates and types env vars at runtime.
3. **App-specific env** (`apps/triply.api/src/config/env.ts`) — extends the base schema with app-specific keys.
4. **NestJS ConfigModule** — registers namespaced config objects accessible via `ConfigService`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Application

| Variable      | Type   | Default       | Description                                             |
| ------------- | ------ | ------------- | ------------------------------------------------------- |
| `NODE_ENV`    | string | `development` | `development` \| `sandbox` \| `production` \| `test`    |
| `APP_MODE`    | string | `sandbox`     | `sandbox` (test keys, Swagger on) \| `live` (prod keys) |
| `PORT`        | number | `3000`        | HTTP server port                                        |
| `API_PREFIX`  | string | `api`         | Global URL prefix (e.g. `/api/v1/...`)                  |
| `API_VERSION` | string | `1.0.0`       | Default API version for URI versioning                  |

### CORS

| Variable       | Type   | Default | Description                                     |
| -------------- | ------ | ------- | ----------------------------------------------- |
| `CORS_ORIGINS` | string | `*`     | Comma-separated allowed origins, or `*` for all |

### Swagger

| Variable              | Type   | Default                          | Description             |
| --------------------- | ------ | -------------------------------- | ----------------------- |
| `SWAGGER_TITLE`       | string | `Triply API`                     | OpenAPI doc title       |
| `SWAGGER_DESCRIPTION` | string | `The Triply Travel Platform API` | OpenAPI doc description |
| `SWAGGER_VERSION`     | string | `1.0`                            | OpenAPI doc version     |

> Swagger is **automatically disabled** in production live mode (`NODE_ENV=production` + `APP_MODE=live`).

### Rate Limiting

| Variable         | Type   | Default | Description                        |
| ---------------- | ------ | ------- | ---------------------------------- |
| `THROTTLE_TTL`   | number | `60000` | Time window in milliseconds        |
| `THROTTLE_LIMIT` | number | `100`   | Max requests per window per client |

### Amadeus API

| Variable             | Type   | Default  | Description                                                                  |
| -------------------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `AMADEUS_API_URL`    | string | —        | `https://test.api.amadeus.com` (sandbox) or `https://api.amadeus.com` (live) |
| `AMADEUS_API_KEY`    | string | —        | Your Amadeus API key                                                         |
| `AMADEUS_API_SECRET` | string | —        | Your Amadeus API secret                                                      |
| `AMADEUS_APP_NAME`   | string | `triply` | Application name for Amadeus                                                 |

### Database (optional — for future modules)

| Variable       | Type   | Default | Description                  |
| -------------- | ------ | ------- | ---------------------------- |
| `DATABASE_URL` | string | —       | PostgreSQL connection string |
| `MONGODB_URI`  | string | —       | MongoDB connection string    |
| `REDIS_URL`    | string | —       | Redis connection string      |

### JWT (optional — for future auth)

| Variable         | Type   | Default | Description                 |
| ---------------- | ------ | ------- | --------------------------- |
| `JWT_SECRET`     | string | —       | Secret key for JWT signing  |
| `JWT_EXPIRATION` | number | —       | Token expiration in seconds |

## App Modes

The `APP_MODE` variable controls the application behaviour:

| Mode      | Swagger  | Error Detail | API Keys   | Use Case              |
| --------- | -------- | ------------ | ---------- | --------------------- |
| `sandbox` | Enabled  | Verbose      | Test keys  | Development & testing |
| `live`    | Disabled | Minimal      | Production | Production deployment |

## Environments

The `NODE_ENV` variable maps to standard environments:

| Value         | Description                       |
| ------------- | --------------------------------- |
| `development` | Local development with hot reload |
| `sandbox`     | Staging / QA environment          |
| `production`  | Production deployment             |
| `test`        | Automated test runs               |

## How Configuration Flows

```
.env file
  │
  ▼
arkenv(schema)                     ← Runtime type validation
  │                                  (apps/triply.api/src/config/env.ts)
  ▼
createAppConfig(env)               ← Builds namespaced config object
  │                                  (libs/shared/src/lib/config/app.config.ts)
  ▼
ConfigModule.forRoot({ load: [appConfig] })
  │                                  (apps/triply.api/src/app.module.ts)
  ▼
ConfigService.get('app.port')      ← Accessed anywhere via DI
```

## Secrets Management (Infisical)

For team environments, Triply supports [Infisical](https://infisical.com/) for secrets:

```bash
# One-time setup
npm run infisical:setup

# Start with secrets injected
npm run infisical:dev      # development
npm run infisical:build    # production build
npm run infisical:test     # test run
```

## Next Steps

- [API Reference →](../api/triply-api.md)
- [Installation →](./installation.md)
