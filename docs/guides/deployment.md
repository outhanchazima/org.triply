# Deployment Guide

## Building for Production

### Application Build

```bash
# Standard production build
npm run build:prod
# Equivalent to: npx nx build triply.api --configuration=production

# Build output location:
# dist/apps/triply.api/
```

### Build All Projects

```bash
# Build everything (app + all libs)
npm run build:all

# Build only libraries
npm run build:libs
```

### Start Production Server

```bash
# After building:
npm run start:prod
# Equivalent to: node dist/apps/triply.api/main.js
```

## Environment Configuration

### Production Checklist

| Setting              | Value                     | Notes                            |
| -------------------- | ------------------------- | -------------------------------- |
| `NODE_ENV`           | `production`              | Enables production optimisations |
| `APP_MODE`           | `live`                    | Disables Swagger, minimal errors |
| `AMADEUS_API_URL`    | `https://api.amadeus.com` | Live Amadeus API                 |
| `AMADEUS_API_KEY`    | Production key            | From Amadeus dashboard           |
| `AMADEUS_API_SECRET` | Production secret         | From Amadeus dashboard           |
| `CORS_ORIGINS`       | Your frontend domain(s)   | Never `*` in production          |
| `THROTTLE_LIMIT`     | Tuned for your load       | Default: 100 req/min             |

### Secrets Management

For production, use [Infisical](https://infisical.com/) instead of `.env` files:

```bash
# Build with secrets injected
npm run infisical:build

# Or run directly
infisical run --env=prod -- node dist/apps/triply.api/main.js
```

## Docker

### Generate Dockerfile

```bash
npx nx generate @nx/node:setup-docker --project=triply.api
```

### Example Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build triply.api --configuration=production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/triply.api ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "main.js"]
```

### Docker Compose (development)

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      - postgres
      - mongo
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: triply
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'

  mongo:
    image: mongo:7
    ports:
      - '27017:27017'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

## CI/CD Pipeline

### GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on every push to `main` and every PR:

```
Push / PR
  │
  ├── Checkout code
  ├── Setup Node.js 22
  ├── npm ci --legacy-peer-deps
  ├── Format check
  ├── Type checking (npx nx run-many -t typecheck)
  ├── Lint + Test + Build (npx nx run-many -t lint test build)
  └── Nx Cloud fix-ci (auto-fix suggestions)
```

A separate job validates conventional commit messages on PRs.

### Nx Cloud

The workspace is connected to Nx Cloud for:

- **Remote caching** — build/test artifacts shared across CI runs and developers.
- **Distributed task execution** — split work across multiple machines.
- **Build insights** — monitor performance trends.

## Health Checks

The application exposes health endpoints excluded from the global prefix:

| Endpoint  | Purpose                     |
| --------- | --------------------------- |
| `/health` | Application liveness check  |
| `/ready`  | Application readiness check |

Use these for load balancer health probes and Kubernetes liveness/readiness probes.

## Graceful Shutdown

The application calls `enableShutdownHooks()` during bootstrap, which ensures:

- Active HTTP connections are drained before exit.
- Database connections are closed cleanly.
- Background jobs complete or are re-queued.

Signals handled: `SIGTERM`, `SIGINT`.

## Performance Considerations

- **Compression** is enabled by default via `compression()` middleware.
- **Rate limiting** is enforced globally via `ThrottlerGuard`.
- **Nx build caching** ensures only affected projects are rebuilt.
- **SWC** is used instead of `tsc` for faster builds.

## Monitoring (Future)

Recommended additions for production:

- **OpenTelemetry** — distributed tracing.
- **Prometheus** — metrics collection.
- **Grafana** — dashboards and alerting.
- **Sentry** — error tracking and performance monitoring.

## Next Steps

- [Testing Guide →](./testing.md)
- [Architecture Overview →](../architecture/overview.md)
