# Shared Library (`@org.triply/shared`)

## Overview

Cross-cutting concerns shared by all applications and some libraries. Provides configuration management, an HTTP client, decorators, exception filters, interceptors, middleware, pipes, and a comprehensive utility toolkit.

**Import:** `@org.triply/shared`

## Modules

### SharedModule

```typescript
import { SharedModule } from '@org.triply/shared';

@Module({
  imports: [SharedModule],
})
export class AppModule {}
```

**Exports:** `RequestService`, `HttpModule`

### HealthModule

```typescript
import { HealthModule } from '@org.triply/shared';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

**Endpoints:** `GET /health`, `GET /ready`

## Configuration

### Environment Validation

The library provides a base environment schema using `arkenv` for runtime-safe env parsing:

```typescript
import { baseEnvSchema } from '@org.triply/shared';
import arkenv, { type } from 'arkenv';

const env = arkenv({
  ...baseEnvSchema,
  // App-specific keys:
  MY_API_KEY: 'string',
  MY_TIMEOUT: type('number').default(5000),
});
```

### createAppConfig()

Factory function that creates a NestJS namespaced config from validated env vars:

```typescript
import { createAppConfig } from '@org.triply/shared';
import { env } from './env';

export const appConfig = createAppConfig(env);
// Accessible via ConfigService.get('app.port'), ConfigService.get('app.cors.origins'), etc.
```

**Returned config shape:**

| Key                 | Type     | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `app.env`           | string   | Current NODE_ENV                             |
| `app.mode`          | string   | `sandbox` or `live`                          |
| `app.port`          | number   | HTTP server port                             |
| `app.prefix`        | string   | Global URL prefix                            |
| `app.version`       | string   | API version                                  |
| `app.isProduction`  | boolean  | `true` if NODE_ENV is production             |
| `app.isDevelopment` | boolean  | `true` if NODE_ENV is development            |
| `app.isSandbox`     | boolean  | `true` if APP_MODE is sandbox                |
| `app.isLive`        | boolean  | `true` if APP_MODE is live                   |
| `app.cors.origins`  | string[] | Parsed CORS origins                          |
| `app.swagger.*`     | object   | Swagger title, description, version, enabled |
| `app.throttle.*`    | object   | TTL and limit                                |

### Enums

```typescript
import { Environment, AppMode } from '@org.triply/shared';

Environment.Development; // 'development'
Environment.Sandbox; // 'sandbox'
Environment.Production; // 'production'
Environment.Test; // 'test'

AppMode.Sandbox; // 'sandbox'
AppMode.Live; // 'live'
```

## RequestService

Injectable HTTP client wrapping `@nestjs/axios` with automatic content-type negotiation, bearer-token injection, retry logic, health checks, and binary downloads.

### Quick Usage

```typescript
import { RequestService } from '@org.triply/shared';

@Injectable()
export class PaymentsService {
  constructor(private readonly http: RequestService) {}

  async charge(amount: number) {
    return this.http.postRequest<{ amount: number }, ChargeResult>('https://payments.example.com/charge', { amount });
  }
}
```

### Methods

#### Legacy Convenience Methods

| Method            | HTTP Verb | Signature                                                           |
| ----------------- | --------- | ------------------------------------------------------------------- |
| `getRequest()`    | GET       | `(url, token?, headers?) → { status, data }`                        |
| `postRequest()`   | POST      | `(url, payload, contentType?, token?, headers?) → { status, data }` |
| `putRequest()`    | PUT       | `(url, payload, contentType?, token?, headers?) → { status, data }` |
| `patchRequest()`  | PATCH     | `(url, payload, contentType?, token?, headers?) → { status, data }` |
| `deleteRequest()` | DELETE    | `(url, token?, headers?) → { data } \| void`                        |

#### Advanced Methods

| Method                 | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `request(options)`     | Generic request with `RequestOptions` bag              |
| `requestFull(options)` | Like `request()` but returns response headers too      |
| `getWithParams()`      | GET with typed query parameters                        |
| `headRequest()`        | HEAD — returns status and headers only                 |
| `requestWithRetry()`   | Request with automatic retry + exponential back-off    |
| `isAlive(url)`         | Health check — returns `true` if endpoint responds 2xx |
| `downloadRequest()`    | Binary download as `ArrayBuffer`                       |

#### RequestOptions Interface

```typescript
interface RequestOptions {
  method?: HttpMethod; // Default: 'GET'
  url: string;
  payload?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  contentType?: RequestContentType | string;
  token?: string; // Bearer token
  headers?: AxiosRequestHeaders;
  timeout?: number; // Default: 60000ms
  responseType?: AxiosRequestConfig['responseType'];
}
```

#### Content Types

```typescript
enum RequestContentType {
  FORM_URLENCODED = 'application/x-www-form-urlencoded',
  FORM_DATA = 'multipart/form-data',
  JSON = 'application/json',
}
```

## Decorators

| Decorator                    | Location            | Description                                  |
| ---------------------------- | ------------------- | -------------------------------------------- |
| `@Public()`                  | Method / Controller | Marks route as public (bypass auth guard)    |
| `@RequestId()`               | Parameter           | Extracts `X-Request-Id` from request headers |
| `@ApiPaginatedResponse(dto)` | Method              | Swagger decorator for paginated responses    |

### Usage

```typescript
@Public()
@Get('health')
healthCheck() { return { status: 'ok' }; }

@Get('users')
@ApiPaginatedResponse(UserDto)
findAll(@RequestId() requestId: string) { ... }
```

## DTOs

### PaginationQueryDto

Reusable DTO for paginated endpoints:

```typescript
import { PaginationQueryDto } from '@org.triply/shared';

@Get()
findAll(@Query() query: PaginationQueryDto) {
  // query.page, query.limit
}
```

## Exception Filters

| Filter                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `AllExceptionsFilter` | Catches all unhandled exceptions, formats response     |
| `HttpExceptionFilter` | Formats `HttpException` into consistent error envelope |

**Error response shape:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

## Interceptors

| Interceptor                    | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| `LoggingInterceptor`           | Logs request method, URL, and response time             |
| `ResponseTransformInterceptor` | Wraps responses in a standard `{ data, meta }` envelope |
| `TimeoutInterceptor`           | Throws `RequestTimeoutException` after threshold        |

## Middleware

| Middleware                | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `CorrelationIdMiddleware` | Injects/forwards `X-Request-Id` for distributed tracing |
| `RequestLoggerMiddleware` | HTTP access log (method, URL, status, duration)         |

## Pipes

| Pipe                   | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `ParseOptionalIntPipe` | Parses query param to `number` or returns `undefined` |
| `TrimStringPipe`       | Trims whitespace from string inputs                   |

## Utilities

The `@org.triply/shared` library ships with a rich set of pure utility functions:

### Array Utilities (`array.util.ts`)

| Function    | Description                          |
| ----------- | ------------------------------------ |
| `chunk()`   | Split array into chunks of size N    |
| `unique()`  | Deduplicate by value or key function |
| `flatten()` | Flatten nested arrays                |
| `groupBy()` | Group items by key function          |
| `sortBy()`  | Sort by key with direction           |

### Async Utilities (`async.util.ts`)

| Function    | Description                               |
| ----------- | ----------------------------------------- |
| `sleep()`   | Promise-based delay                       |
| `timeout()` | Race a promise against a timeout          |
| `pool()`    | Concurrent execution with max parallelism |
| `retry()`   | Retry with exponential back-off           |

### Cache Utility (`cache.util.ts`)

In-memory TTL cache for lightweight caching without Redis.

### Code Utility (`code.util.ts`)

Random code generators (OTP, reference numbers, etc.).

### DateTime Utility (`datetime.util.ts`)

Date formatting and manipulation using `date-fns`.

### Hash Utility (`hash.util.ts`)

| Function          | Description                    |
| ----------------- | ------------------------------ |
| `sha256()`        | SHA-256 hash                   |
| `generateToken()` | Cryptographically random token |
| `safeCompare()`   | Timing-safe string comparison  |

### Math Utility (`math.util.ts`)

Rounding, clamping, percentages, and range checks.

### Money Utility (`money.util.ts`)

Currency formatting and conversion helpers.

### Object Utility (`object.util.ts`)

| Function      | Description                           |
| ------------- | ------------------------------------- |
| `deepMerge()` | Deep merge objects                    |
| `pick()`      | Pick specific keys                    |
| `omit()`      | Omit specific keys                    |
| `flatten()`   | Flatten nested object to dot-notation |

### Pagination Utility (`pagination.util.ts`)

| Function                | Description                               |
| ----------------------- | ----------------------------------------- |
| `buildPaginationMeta()` | Build pagination metadata from total/page |
| `paginatedResponse()`   | Wrap data + pagination into response      |

### Retry Utility (`retry.util.ts`)

```typescript
import { retry, RetryOptions } from '@org.triply/shared';

const result = await retry(() => fetchData(), {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: true, // exponential
});
```

### Sanitize Utility (`sanitize.util.ts`)

| Function              | Description                              |
| --------------------- | ---------------------------------------- |
| `stripHtml()`         | Remove HTML tags                         |
| `stripSpecialChars()` | Remove special characters (configurable) |
| `escapeSql()`         | Escape SQL injection characters          |
| `sanitize()`          | Combined strip + trim + truncate         |

### Slug Utility (`slug.util.ts`)

URL-safe slug generation from strings.

### String Utility (`string.util.ts`)

String manipulation helpers (truncate, capitalize, camelCase, etc.).

## Next Steps

- [Database Library →](./database.md)
- [Amadeus Library →](./amadeus.md)
