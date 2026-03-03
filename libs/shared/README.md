# @org.triply/shared

Shared NestJS library for the OrgTriply backend monorepo. Provides reusable utilities, auth and authorization infrastructure, audit integration, file upload support, mail integration, and common NestJS building blocks (filters, interceptors, decorators, pipes, middleware).

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
├── auth/              # JWT/Google strategies, guards, decorators, controllers, CASL
├── audit/             # Audit decorator, interceptor, service integration
├── config/            # App config factory & env validation
├── constants/         # PAGINATION_DEFAULTS, CORS_DEFAULTS, RATE_LIMIT_DEFAULTS, REQUEST_TIMEOUT_MS
├── decorators/        # @Public, @ApiPaginatedResponse, @RequestId
├── dto/               # PaginationQueryDto
├── filters/           # HttpExceptionFilter, AllExceptionsFilter
├── file-upload/       # Upload controller, storage adapters, file metadata services
├── health/            # HealthModule & HealthController
├── interceptors/      # ResponseTransformInterceptor, LoggingInterceptor, TimeoutInterceptor
├── mail/              # MailModule + transactional email service/templates
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

Imports `ConfigModule` and provides `RequestService` — a typed HTTP client wrapper around `@nestjs/axios` with content-type negotiation, Bearer-token injection, per-request timing, retry with back-off, query-string serialisation, binary downloads, and health-check probes.

#### `RequestService` — legacy convenience methods

| Method                                             | Description                     |
| -------------------------------------------------- | ------------------------------- |
| `getRequest<R>(url, token?, headers?)`             | GET with optional auth          |
| `postRequest<P,R>(url, payload, ct?, token?, h?)`  | POST with body encoding         |
| `putRequest<P,R>(url, payload, ct?, token?, h?)`   | PUT with body encoding          |
| `patchRequest<P,R>(url, payload, ct?, token?, h?)` | PATCH with body encoding        |
| `deleteRequest<R>(url, token?, headers?)`          | DELETE — returns body or `void` |

#### `RequestService` — advanced API

| Method                                        | Description                                                        |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `request<R>(options)`                         | Generic single-object API with query params, timeout, responseType |
| `requestFull<R>(options)`                     | Like `request()` but also returns response **headers**             |
| `getWithParams<R>(url, params, token?, h?)`   | GET with typed query-string params auto-serialised via `qs`        |
| `headRequest(url, token?, headers?)`          | HEAD — status + response headers (no body transfer)                |
| `requestWithRetry<R>(options, retryOptions?)` | Automatic retry with exponential back-off via `retry.util`         |
| `isAlive(url, timeout?)`                      | Health-check probe — returns `true` on 2xx (default 5 s timeout)   |
| `downloadRequest(url, token?, headers?)`      | Binary download as `ArrayBuffer` + response headers                |

#### Exported types

| Type                 | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `RequestContentType` | Enum: `JSON`, `FORM_URLENCODED`, `FORM_DATA`                |
| `HttpMethod`         | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE' \| 'HEAD'` |
| `RequestOptions`     | Options bag for `request()` / `requestWithRetry()`          |
| `FullResponse<R>`    | `{ status, data, headers }` envelope                        |

```typescript
// Query-param GET with custom timeout
const { data } = await http.request<FlightOffer[]>({
  url: 'https://api.amadeus.com/v2/shopping/flight-offers',
  params: { originLocationCode: 'LLW', destinationLocationCode: 'JNB' },
  token: amadeusToken,
  timeout: 30_000,
});

// Retry a payment call
const { data: result } = await http.requestWithRetry<PaymentResult>({ method: 'POST', url: paymentUrl, payload: { amount: 5000 }, token }, { maxAttempts: 3, delayMs: 1000, backoff: true });

// Health-check probe
if (await http.isAlive('https://api.example.com/health')) {
  /* reachable */
}
```

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

## Authorization & Access Control

### CASL Integration

The `casl` folder provides access control support using `@casl/ability` library.

| Export               | Description                                        |
| -------------------- | -------------------------------------------------- |
| `CaslAbilityFactory` | Service to define and create application abilities |
| `PoliciesGuard`      | NestJS guard that enforces CASL policies           |

```typescript
import { CaslAbilityFactory, PoliciesGuard } from '@org.triply/shared';

@UseGuards(PoliciesGuard)
@CheckPolicies(({ user, ability }) => ability.can('read', 'Post'))
async getPost(@Param('id') id: string) {
  return this.postsService.findOne(id);
}
```

### Authentication Guards

| Guard                  | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `JwtAuthGuard`         | Validates JWT tokens and extracts user from token |
| `RolesGuard`           | Validates user has required roles                 |
| `PermissionsGuard`     | Validates user has required permissions           |
| `BusinessContextGuard` | Ensures request is within valid business context  |
| `SystemUserGuard`      | Restricts access to system users only             |
| `SelfOrAdminGuard`     | Allows self-access or admin override              |

```typescript
import { JwtAuthGuard, RolesGuard, Roles } from '@org.triply/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
```

### Decorators for Authentication

| Decorator            | Description                                     |
| -------------------- | ----------------------------------------------- |
| `@CurrentUser()`     | Extracts authenticated user from request        |
| `@CurrentBusiness()` | Extracts current business context from request  |
| `@RequestId()`       | Extracts request ID from `x-request-id` header  |
| `@Public()`          | Marks endpoint as public (bypasses auth guards) |

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: UserPayload) {
  return user;
}
```

---

## Health Checks

The `health` folder provides health check endpoints and monitoring.

| Export             | Description                                |
| ------------------ | ------------------------------------------ |
| `HealthModule`     | NestJS module providing `/health` endpoint |
| `HealthController` | REST controller for health status          |

```typescript
import { HealthModule } from '@org.triply/shared';

@Module({
  imports: [HealthModule],
})
export class AppModule {}

// GET /health
// => { status: 'ok', timestamp: '2024-02-27T10:00:00Z', ... }
```

---

## Email Service

The `mail` folder provides email sending capabilities with templating.

| Export        | Description                                |
| ------------- | ------------------------------------------ |
| `MailService` | Send emails using templates and transports |

**Available templates:**

- `kyc-approved.hbs` — KYC approval notification
- `kyc-rejected.hbs` — KYC rejection notification
- `kyc-submitted.hbs` — KYC submission confirmation
- `otp-invite.hbs` — OTP invitation email
- `otp-login.hbs` — OTP login code email
- `security-alert.hbs` — Security alert notification

```typescript
import { MailService } from '@org.triply/shared';

constructor(private mail: MailService) {}

async sendWelcome(email: string, name: string) {
  await this.mail.sendOtpInvite(email, { name, code: '123456' });
}
```

---

## Barrel Exports

Each folder provides barrel exports for convenient importing:

```typescript
// Services
import { RequestService } from '@org.triply/shared/services';

// Guards & CASL
import { JwtAuthGuard, RolesGuard, CaslAbilityFactory } from '@org.triply/shared/guards';
import { PoliciesGuard } from '@org.triply/shared/casl';

// Decorators
import { CurrentUser, CurrentBusiness, RequestId, Public } from '@org.triply/shared/decorators';

// Filters
import { HttpExceptionFilter, AllExceptionsFilter } from '@org.triply/shared/filters';

// Interceptors
import { ResponseTransformInterceptor, LoggingInterceptor } from '@org.triply/shared/interceptors';

// Pipes
import { TrimStringPipe, ParseOptionalIntPipe } from '@org.triply/shared/pipes';

// Utils
import { buildCacheKey, formatMoney, slugify } from '@org.triply/shared/utils';
```

Or import from the main entry point:

```typescript
import { SharedModule, RequestService, JwtAuthGuard, CurrentUser, formatMoney } from '@org.triply/shared';
```

---

## Best Practices

1. **Use the RequestService** for external HTTP calls with built-in retry and timeout
2. **Leverage decorators** for extracting auth context (`@CurrentUser`, `@RequestId`)
3. **Apply filters and interceptors globally** for consistent error handling and logging
4. **Use CASL guards** for declarative access control policies
5. **Implement middleware** for cross-cutting concerns like correlation IDs
6. **Use utilities** for string/money/date operations to avoid re-implementing common patterns
7. **Cache aggressively** using `CacheService.wrap()` for expensive operations

---

## Project Structure

```
libs/shared/src/lib/
├── config/              # Application configuration
├── constants/           # Global application constants
├── decorators/          # NestJS parameter & method decorators
├── dto/                 # Data Transfer Objects
├── filters/             # Global exception filters
├── guards/              # Authorization & authentication guards
├── health/              # Health check module & controller
├── interceptors/        # Global request/response interceptors
├── interfaces/          # TypeScript interfaces & types
├── mail/                # Email service & templates
├── middleware/          # Express middleware
├── pipes/               # NestJS validation pipes
├── services/            # HTTP request service
├── utils/               # Pure utility functions (50+ functions)
├── casl/                # CASL authorization & policies
└── shared.module.ts     # Main module export
```

---

## Development

```bash
npx nx build shared            # Build
npx nx test shared              # Unit tests
npx nx test shared --coverage   # Coverage
npx nx lint shared --fix        # Lint & auto-fix
```

## Contributing

When adding features to this library:

1. **Create the feature folder** under `libs/shared/src/lib/`
2. **Add `index.ts`** with barrel exports for the folder
3. **Export from main module** in [shared.module.ts](src/lib/shared.module.ts)
4. **Document in this README** with examples
5. **Add unit tests** in `.spec.ts` files
6. **Update `src/index.ts`** with feature exports

## License

Part of the OrgTriply project.
