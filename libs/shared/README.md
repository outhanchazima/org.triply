# @org.triply/shared

Shared NestJS library for the OrgTriply backend monorepo. Provides reusable utilities, NestJS building blocks (filters, interceptors, decorators, pipes, middleware), standardised API response types, caching, and an HTTP request service.

## Quick start

```typescript
import { Module } from '@nestjs/common';
import { SharedModule, SharedCacheModule } from '@org.triply/shared';

@Module({
  imports: [
    SharedModule, // RequestService
    SharedCacheModule.register({ ttl: 60_000, isGlobal: true }), // CacheService
  ],
})
export class AppModule {}
```

## Structure

```
libs/shared/src/lib/
├── config/            # App config factory & env validation
├── constants/         # PAGINATION_DEFAULTS, CORS_DEFAULTS, RATE_LIMIT_DEFAULTS, REQUEST_TIMEOUT_MS
├── decorators/        # @Public, @ApiPaginatedResponse, @RequestId
├── dto/               # PaginationQueryDto
├── filters/           # HttpExceptionFilter, AllExceptionsFilter
├── health/            # HealthModule & HealthController
├── interceptors/      # ResponseTransformInterceptor, LoggingInterceptor, TimeoutInterceptor
├── interfaces/        # ApiSuccessResponse, ApiErrorResponse, PaginatedResponse, PaginationMeta
├── middleware/         # CorrelationIdMiddleware, RequestLoggerMiddleware
├── pipes/             # TrimStringPipe, ParseOptionalIntPipe
├── services/          # RequestService (HTTP client wrapper)
├── utils/             # Pure-function utilities (see below)
└── shared.module.ts   # SharedModule
```

---

## Modules

### `SharedModule`

Imports `ConfigModule` and provides `RequestService` — a typed HTTP client wrapper around `@nestjs/axios` supporting JSON, form-urlencoded, and multipart content types.

### `SharedCacheModule`

Wraps `@nestjs/cache-manager` (backed by `cache-manager` v7) and provides an injectable `CacheService`.

```typescript
SharedCacheModule.register({ ttl: 30_000, max: 500, isGlobal: true });
```

| Option     | Default | Description                         |
| ---------- | ------- | ----------------------------------- |
| `ttl`      | `5000`  | Default TTL in ms for cache entries |
| `max`      | `1000`  | Max items (in-memory store)         |
| `isGlobal` | `false` | Register globally across the app    |

#### `CacheService` API

| Method                     | Description                       |
| -------------------------- | --------------------------------- |
| `get<T>(key)`              | Read a single cached value        |
| `mget<T>(keys)`            | Read multiple values              |
| `set<T>(key, value, ttl?)` | Write a value with optional TTL   |
| `mset<T>(list)`            | Write multiple values             |
| `del(key)` / `mdel(keys)`  | Delete one or many entries        |
| `clear()`                  | Flush all entries                 |
| `ttl(key)`                 | Remaining TTL in ms               |
| `wrap<T>(key, fn, ttl?)`   | Cache-aside / read-through helper |
| `disconnect()`             | Graceful shutdown (Redis, etc.)   |

```typescript
const rate = await this.cache.wrap(buildCacheKey('rate', 'USD', 'MWK'), () => this.fetchRate('USD', 'MWK'), 300_000);
```

---

## Filters

| Class                 | Catches         | Status | Description                                                   |
| --------------------- | --------------- | ------ | ------------------------------------------------------------- |
| `HttpExceptionFilter` | `HttpException` | varies | Standardises HTTP errors into the `ApiErrorResponse` envelope |
| `AllExceptionsFilter` | Everything      | `500`  | Catch-all for unknown errors; includes stack in non-prod      |

```typescript
app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
```

## Interceptors

| Class                          | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `ResponseTransformInterceptor` | Wraps successful responses in `ApiSuccessResponse` envelope |
| `LoggingInterceptor`           | Logs method, URL, and response time for every request       |
| `TimeoutInterceptor`           | Throws `408 Request Timeout` after a configurable deadline  |

```typescript
app.useGlobalInterceptors(new ResponseTransformInterceptor(), new LoggingInterceptor(), new TimeoutInterceptor(15_000));
```

## Decorators

| Decorator                 | Type   | Description                                             |
| ------------------------- | ------ | ------------------------------------------------------- |
| `@Public()`               | Method | Marks a route as publicly accessible (skips auth guard) |
| `@ApiPaginatedResponse()` | Method | Swagger schema for paginated endpoints                  |
| `@RequestId()`            | Param  | Extracts the `x-request-id` header value                |

## Middleware

| Class                     | Description                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `CorrelationIdMiddleware` | Ensures every request has an `x-request-id` header (auto-generates if missing) |
| `RequestLoggerMiddleware` | Logs method, URL, status, content-length, duration, IP, user-agent             |

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
```

## Pipes

| Class                  | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `TrimStringPipe`       | Trims whitespace from strings (optionally deep into objects)     |
| `ParseOptionalIntPipe` | Parses optional integer query params; passes `undefined` through |

## DTOs

| Class                | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `PaginationQueryDto` | `page` (default 1) and `limit` (default 20, max 100) with a `skip` getter |

## Interfaces

| Interface            | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `ApiResponseMeta`    | `timestamp`, `path`, `requestId`                                 |
| `ApiSuccessResponse` | `{ success: true, data: T, meta }`                               |
| `ApiErrorResponse`   | `{ success: false, error, meta }`                                |
| `PaginationMeta`     | `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrevious` |
| `PaginatedResponse`  | `{ success: true, data: T[], pagination, meta }`                 |

## Constants

| Constant              | Value                                      |
| --------------------- | ------------------------------------------ |
| `PAGINATION_DEFAULTS` | `{ PAGE: 1, LIMIT: 20, MAX_LIMIT: 100 }`   |
| `CORS_DEFAULTS`       | Methods, allowed headers, max-age (3600 s) |
| `RATE_LIMIT_DEFAULTS` | `{ TTL: 60_000, LIMIT: 100 }`              |
| `REQUEST_TIMEOUT_MS`  | `30_000`                                   |

## Config

| Export            | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `createAppConfig` | Factory for typed app configuration                           |
| `baseEnvSchema`   | Base environment variable validation schema                   |
| `validate`        | Config validation function for `ConfigModule.forRoot`         |
| `Environment`     | Enum of environment names (`development`, `production`, etc.) |
| `AppMode`         | Application mode type                                         |

---

## Utilities

All utilities are **pure functions** — no NestJS DI required. Import directly:

```typescript
import { buildCacheKey, slugify, formatMoney } from '@org.triply/shared';
```

### Cache — `cache.util.ts`

| Export          | Description                            |
| --------------- | -------------------------------------- |
| `buildCacheKey` | Build a colon-delimited key from parts |

### Code generation — `code.util.ts`

| Export                   | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `generateTransactionRef` | Cryptographic alphanumeric ref (like MPESA)     |
| `generateOrderId`        | Prefixed order ID (`ORD-...`)                   |
| `generateBookingRef`     | 6-char booking reference                        |
| `generateOTP`            | Numeric one-time password                       |
| `generateShortId`        | Short alphanumeric ID                           |
| `generateUUID`           | UUID v4                                         |
| `generatePrefixedId`     | Prefixed UUID (`usr_...`)                       |
| `generateInvoiceNumber`  | Sequential invoice number with Luhn check digit |
| `isValidTransactionRef`  | Validate a transaction reference                |
| `luhnCheckDigit`         | Compute a Luhn check digit                      |
| `isValidLuhn`            | Validate a Luhn-protected string                |

### Datetime — `datetime.util.ts`

Wrappers around `date-fns` for parsing, formatting, duration, difference, checks, manipulation, and timezone helpers.

| Export                             | Description                           |
| ---------------------------------- | ------------------------------------- |
| `toDate`                           | Parse any date-like input             |
| `formatDate`                       | `yyyy-MM-dd`                          |
| `formatDateTime`                   | `yyyy-MM-dd HH:mm:ss`                 |
| `formatDateHuman`                  | `dd MMM yyyy`                         |
| `formatTime`                       | `HH:mm`                               |
| `formatTime12h`                    | `hh:mm a`                             |
| `timeAgo`                          | Relative duration string              |
| `durationBetween`                  | Human-readable duration between dates |
| `diffInSeconds/Minutes/Hours/Days` | Numeric differences                   |
| `isExpired`                        | Check if a date is in the past        |
| `isWithinMinutes`                  | Check if within N minutes of now      |
| `dateRange`                        | Array of dates between start and end  |
| `nowUTC`                           | Current UTC date                      |
| `unixTimestamp`                    | Current Unix timestamp (seconds)      |
| `fromUnixTimestamp`                | Parse a Unix timestamp                |

### Hash — `hash.util.ts`

| Export          | Description                    |
| --------------- | ------------------------------ |
| `sha256`        | SHA-256 hex digest of a string |
| `generateToken` | Cryptographic random hex token |
| `safeCompare`   | Timing-safe string comparison  |

### Math — `math.util.ts`

Precision arithmetic (avoids floating-point errors), rounding, comparison, and distance.

| Export                                | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `preciseAdd/Subtract/Multiply/Divide` | Integer-scaled arithmetic                 |
| `bankersRound`                        | Banker's rounding (round half to even)    |
| `truncateDecimals`                    | Truncate to N decimal places              |
| `ceilTo` / `floorTo`                  | Ceil / floor to N decimal places          |
| `nearlyEqual`                         | Float comparison with epsilon             |
| `clamp`                               | Clamp a value between min and max         |
| `roundTo`                             | Round to N decimal places                 |
| `randomInt/Float`                     | Random number in range                    |
| `percentage`                          | Calculate percentage                      |
| `percentageChange`                    | Percentage change between two values      |
| `sum` / `average` / `median`          | Array aggregations                        |
| `haversineDistance`                   | Great-circle distance between coordinates |

### Money — `money.util.ts`

All monetary values use **integer minor units** (cents / tambala) to avoid floating-point errors. Currency conversion uses **BigInt-scaled exchange rates** (×10¹²).

| Export                       | Description                           |
| ---------------------------- | ------------------------------------- |
| `money`                      | Create `Money` from major units       |
| `moneyFromMinor`             | Create `Money` from minor units       |
| `toMinorUnits`               | Major → minor                         |
| `toMajorUnits`               | Minor → major                         |
| `addMoney` / `subtractMoney` | Arithmetic (same currency)            |
| `multiplyMoney`              | Multiply by scalar                    |
| `percentOf`                  | Percentage of a Money value           |
| `splitMoney`                 | Split into N equal parts (exact)      |
| `formatMoney`                | Locale-aware display string           |
| `formatMoneyNumeric`         | Plain numeric string                  |
| `isZero/Positive/Negative`   | Boolean checks                        |
| `compareMoney`               | Compare two Money values (−1 / 0 / 1) |
| `exchangeRate`               | Create high-precision exchange rate   |
| `convertMoney`               | Convert between currencies            |
| `formatRate`                 | Display an exchange rate              |

### Object — `object.util.ts`

| Export              | Description                                |
| ------------------- | ------------------------------------------ |
| `deepClone`         | Structured-clone deep copy                 |
| `pick` / `omit`     | Pick or omit keys from an object           |
| `compact`           | Remove nullish values                      |
| `flatten`           | Flatten nested object to dot-notation keys |
| `getNestedValue`    | Safely read a dot-path                     |
| `setNestedValue`    | Safely write a dot-path                    |
| `deepMerge`         | Recursively merge objects                  |
| `groupBy` / `keyBy` | Group or index an array by key             |

### Pagination — `pagination.util.ts`

| Export                | Description                                  |
| --------------------- | -------------------------------------------- |
| `buildPaginationMeta` | Build `PaginationMeta` from page/limit/total |
| `paginatedResponse`   | Build a full `PaginatedResponse` envelope    |

### Retry — `retry.util.ts`

| Export  | Description                                                   |
| ------- | ------------------------------------------------------------- |
| `retry` | Retry an async function with configurable backoff & callbacks |

### Slug — `slug.util.ts`

| Export    | Description                         |
| --------- | ----------------------------------- |
| `slugify` | Convert a string to a URL-safe slug |

### String — `string.util.ts`

| Export                             | Description                            |
| ---------------------------------- | -------------------------------------- |
| `capitalize`                       | Capitalise first letter                |
| `titleCase`                        | Title Case A String                    |
| `camelCase`                        | Convert to camelCase                   |
| `snakeCase`                        | Convert to snake_case                  |
| `kebabCase`                        | Convert to kebab-case                  |
| `truncate`                         | Truncate with ellipsis                 |
| `mask` / `maskEmail` / `maskPhone` | Mask sensitive data                    |
| `stripWhitespace`                  | Remove all whitespace                  |
| `normalizeWhitespace`              | Collapse runs of whitespace            |
| `isEmail` / `isUrl`                | Simple format validation               |
| `initials`                         | Extract initials from a name           |
| `pluralize`                        | Naive English pluralisation            |
| `padStart`                         | Pad a string/number to a minimum width |

---

## Development

```bash
npx nx build shared            # Build
npx nx test shared              # Unit tests
npx nx test shared --coverage   # Coverage
npx nx lint shared --fix        # Lint & auto-fix
```

## License

Part of the OrgTriply project.
