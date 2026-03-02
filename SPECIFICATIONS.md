# Triply Backend — Technical Specifications

> **Version:** 1.0.0-alpha  
> **Last Updated:** 2026-02-27  
> **Status:** In Development

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Microservices](#4-microservices)
5. [Shared Libraries](#5-shared-libraries)
6. [API Specifications](#6-api-specifications)
7. [Data Models & Storage](#7-data-models--storage)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Security](#10-security)
11. [Performance & Scalability](#11-performance--scalability)
12. [Observability](#12-observability)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Testing Strategy](#14-testing-strategy)
15. [Feature Roadmap](#15-feature-roadmap)

---

## 1. Product Overview

### 1.1 Purpose

Triply is a travel booking and management platform that aggregates flights, hotels, activities, and transfers from multiple providers. The backend exposes REST APIs consumed by web and mobile clients, handling search, booking, payment processing, and trip management.

### 1.2 Target Markets

- **Primary:** African markets (Malawi, Kenya, Tanzania, South Africa, Nigeria)
- **Secondary:** Global travelers booking African destinations
- **Currencies:** Full support for 100+ currencies including all African currencies (MWK, KES, ZAR, NGN, TZS, UGX, RWF, ZMW, GHS, etc.)

### 1.3 Core Capabilities

| Capability            | Status         | Service                       |
| --------------------- | -------------- | ----------------------------- |
| Flight Search         | ✅ Implemented | triply.api                    |
| Flight Booking        | 🔲 Planned     | triply.api                    |
| Hotel Search          | 🔲 Planned     | triply.api                    |
| Hotel Booking         | 🔲 Planned     | triply.api                    |
| Activities & Tours    | 🔲 Planned     | triply.api                    |
| Airport Transfers     | 🔲 Planned     | triply.api                    |
| Payment Processing    | 🔲 Planned     | triply.payments               |
| User Management       | 🔲 Planned     | triply.api                    |
| Trip Management       | 🔲 Planned     | triply.api                    |
| Notifications         | 🔲 Planned     | triply.notifications (future) |
| Analytics & Reporting | 🔲 Planned     | triply.analytics (future)     |

---

## 2. System Architecture

### 2.1 Architecture Style

Modular monolith evolving toward microservices, organized as an **NX monorepo** with clear library boundaries.

```
┌─────────────────────────────────────────────────────────────┐
│                        NX Workspace                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  triply.api   │  │ triply.payments  │  │  (future)    │  │
│  │  :3000        │  │  :3001           │  │  services    │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────┘  │
│         │                   │                               │
│  ┌──────┴───────────────────┴──────────────────────────┐    │
│  │                  Shared Libraries                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │    │
│  │  │  shared   │ │ database │ │ amadeus │ │  utils │  │    │
│  │  └──────────┘ └──────────┘ └─────────┘ └────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Infrastructure                     │    │
│  │  PostgreSQL │ MongoDB │ Redis │ BullMQ │ Infisical   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Patterns

| Pattern                | Use Case          | Technology                               |
| ---------------------- | ----------------- | ---------------------------------------- |
| REST/HTTP              | Client ↔ API      | NestJS controllers                       |
| Event-driven           | Intra-service     | @nestjs/event-emitter                    |
| Message queue          | Async jobs        | BullMQ (Redis-backed)                    |
| Microservice transport | Service ↔ Service | @nestjs/microservices (planned)          |
| WebSocket              | Real-time updates | @nestjs/websockets + Socket.IO (planned) |

### 2.3 Module Boundary Rules

```
type:app     → can depend on type:lib only
type:e2e     → can depend on type:app + type:lib
scope:shared → can depend on scope:shared only
scope:api    → can depend on scope:api + scope:shared
scope:payments → can depend on scope:payments + scope:shared
```

---

## 3. Technology Stack

### 3.1 Runtime

| Component       | Technology | Version  |
| --------------- | ---------- | -------- |
| Runtime         | Node.js    | 22+      |
| Language        | TypeScript | ~5.9.3   |
| Framework       | NestJS     | ^11.1.14 |
| Monorepo        | NX         | 22.5.2   |
| Package Manager | npm        | latest   |

### 3.2 Data Stores

| Store          | Technology                   | Purpose                                              |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| Primary DB     | PostgreSQL (TypeORM ^0.3.28) | Relational data (users, bookings, payments)          |
| Document DB    | MongoDB (Mongoose ^9.2.2)    | Flexible documents (search results, logs, analytics) |
| Cache / Queues | Redis (ioredis ^5.9.3)       | Caching, session store, BullMQ backing store         |

### 3.3 Key Libraries

| Library                          | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| class-validator ^0.14.3          | DTO validation via decorators                    |
| class-transformer ^0.5.1         | DTO serialization/transformation                 |
| date-fns ^4.1.0                  | Date manipulation                                |
| helmet ^8.1.0                    | HTTP security headers                            |
| compression ^1.8.1               | Response compression                             |
| @node-rs/bcrypt ^1.10.7          | Password hashing (Rust-backed, high performance) |
| @infisical/sdk ^4.0.6            | Secrets management                               |
| arkenv ^0.11.0 / arktype ^2.1.29 | Runtime environment validation                   |
| rxjs ^7.8.2                      | Reactive streams                                 |
| ulid ^3.0.2                      | Sortable unique IDs                              |

### 3.4 Dev Tooling

| Tool                           | Purpose                           |
| ------------------------------ | --------------------------------- |
| Jest ^30.2.0 + @swc/jest       | Unit & integration tests          |
| ESLint ^9.39.3                 | Linting (flat config)             |
| Prettier ^3.8.1                | Code formatting                   |
| husky + lint-staged            | Pre-commit hooks                  |
| commitlint + czg + changelogen | Conventional commits & changelogs |

---

## 4. Microservices

### 4.1 triply.api (Main API)

**Port:** 3000 (configurable via `PORT`)  
**Prefix:** `/api` (configurable via `API_PREFIX`)  
**Versioning:** URI-based (`/api/v1/...`)

#### Bootstrap Configuration

| Feature       | Implementation                                                     |
| ------------- | ------------------------------------------------------------------ |
| Security      | helmet(), CORS (configurable origins), compression                 |
| Rate Limiting | ThrottlerModule (60s window, 100 req default)                      |
| Validation    | Global ValidationPipe (whitelist, transform, forbidNonWhitelisted) |
| Documentation | Swagger (disabled in production+live mode) at `/{prefix}/docs`     |
| Events        | EventEmitterModule (delimiter: '.', maxListeners: 20)              |
| Health        | GET /health, GET /ready (excluded from prefix & throttle)          |
| Shutdown      | Graceful shutdown hooks enabled                                    |

#### Current Modules

| Module        | Description                   | Dependencies  |
| ------------- | ----------------------------- | ------------- |
| FlightsModule | Flight search via Amadeus API | AmadeusModule |

#### Planned Modules

| Module              | Description                              | Dependencies                                  |
| ------------------- | ---------------------------------------- | --------------------------------------------- |
| AuthModule          | JWT authentication, Passport strategies  | SharedModule, DatabaseModule                  |
| UsersModule         | User registration, profiles, preferences | DatabaseModule, AuthModule                    |
| BookingsModule      | Flight & hotel booking management        | AmadeusModule, DatabaseModule, PaymentsModule |
| HotelsModule        | Hotel search & booking                   | AmadeusModule, DatabaseModule                 |
| ActivitiesModule    | Tours & activities                       | AmadeusModule, DatabaseModule                 |
| TransfersModule     | Airport transfers                        | AmadeusModule, DatabaseModule                 |
| TripsModule         | Trip itinerary management                | DatabaseModule                                |
| NotificationsModule | Email, SMS, push notifications           | BullMQ, DatabaseModule                        |

### 4.2 triply.payments (Payment Service)

**Port:** 3001 (configurable via `PAYMENTS_PORT`)  
**Prefix:** `/api`  
**Status:** Scaffold only — no payment logic implemented

#### Planned Capabilities

| Feature                | Provider                               |
| ---------------------- | -------------------------------------- |
| Mobile Money           | M-PESA, Airtel Money, TNM Mpamba       |
| Card Payments          | Stripe, PayStack, Flutterwave          |
| Bank Transfers         | Direct bank integration                |
| Payment Reconciliation | Internal                               |
| Refund Processing      | Per-provider                           |
| Currency Conversion    | Internal (money.util.ts BigInt engine) |

---

## 5. Shared Libraries

### 5.1 @org.triply/shared

Cross-cutting concerns consumed by all apps.

| Category         | Components                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Config**       | `createAppConfig`, `baseEnvSchema`, `Environment`, `AppMode`, `validate`                                 |
| **Constants**    | `PAGINATION_DEFAULTS`, `CORS_DEFAULTS`, `RATE_LIMIT_DEFAULTS`, `REQUEST_TIMEOUT_MS`                      |
| **Middleware**   | `CorrelationIdMiddleware`, `RequestLoggerMiddleware`                                                     |
| **DTOs**         | `PaginationQueryDto`                                                                                     |
| **Pipes**        | `TrimStringPipe`, `ParseOptionalIntPipe`                                                                 |
| **Interceptors** | `TimeoutInterceptor`                                                                                     |
| **Decorators**   | `@Public()`, `@RequestId()`, `@ApiPaginatedResponse()`                                                   |
| **Filters**      | `HttpExceptionFilter`, `AllExceptionsFilter`                                                             |
| **Interfaces**   | `ApiSuccessResponse<T>`, `ApiErrorResponse`, `PaginatedResponse<T>`, `PaginationMeta`, `ApiResponseMeta` |
| **Services**     | `RequestService` (HTTP client with retry, timing, auth)                                                  |
| **Health**       | `HealthModule`, `HealthController`                                                                       |
| **Utilities**    | 15 utility modules (see §5.1.1)                                                                          |

#### 5.1.1 Utility Modules

| Module          | Key Exports                                                                                                                                                                                   | Lines |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| array.util      | unique, chunk, flatten, intersection, difference, sortBy, partition, shuffle, toMap, countBy, zip, sample, minBy, maxBy                                                                       | 373   |
| async.util      | sleep, withTimeout, parallelLimit                                                                                                                                                             | 102   |
| cache.util      | CacheService, SharedCacheModule.register, buildCacheKey                                                                                                                                       | 238   |
| code.util       | generateTransactionRef, generateOrderId, generateBookingRef, generateOTP, generateShortId, generateUUID, generatePrefixedId, generateInvoiceNumber, luhnCheckDigit, isValidLuhn               | 284   |
| datetime.util   | toDate, formatDate, formatDateTime, timeAgo, durationBetween, diffInX, dateRange, nowUTC, unixTimestamp + date-fns re-exports                                                                 | 319   |
| hash.util       | sha256, generateToken, safeCompare                                                                                                                                                            | 53    |
| math.util       | preciseAdd/Subtract/Multiply/Divide, bankersRound, haversineDistance, sum, average, median, clamp, percentage                                                                                 | 445   |
| money.util      | Money type, CURRENCY_CONFIG (100+), toMinorUnits, toMajorUnits, addMoney, subtractMoney, multiplyMoney, formatMoney, convertMoney (BigInt), exchangeRate, inverseRate, crossRate, applySpread | 705   |
| object.util     | deepClone, pick, omit, compact, flatten, getNestedValue, setNestedValue, deepMerge, groupBy, keyBy                                                                                            | 292   |
| pagination.util | buildPaginationMeta, paginatedResponse                                                                                                                                                        | 75    |
| retry.util      | retry (exponential backoff, configurable maxAttempts/delay/onRetry)                                                                                                                           | 92    |
| sanitize.util   | stripHtml, escapeHtml, stripSqlChars, stripSpecialChars, sanitizeFileName, sanitize                                                                                                           | 133   |
| slug.util       | slugify                                                                                                                                                                                       | 27    |
| string.util     | capitalize, titleCase, camelCase, snakeCase, kebabCase, truncate, mask, maskEmail, maskPhone, isEmail, isUrl, initials, pluralize, padStart                                                   | 304   |

### 5.2 @org.triply/database

Multi-database module supporting PostgreSQL, MongoDB, and Redis.

| Component                   | Description                                                                                | Lines |
| --------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| DatabaseModule              | Global dynamic module (forRoot/forRootAsync/forFeature)                                    | 505   |
| DatabaseService             | Main orchestrator for all DB operations                                                    | —     |
| PostgresService             | TypeORM-based PostgreSQL operations                                                        | —     |
| MongoService                | Mongoose-based MongoDB operations                                                          | —     |
| RedisService                | ioredis-based caching & pub/sub                                                            | —     |
| ConnectionManagerService    | Connection pooling, metrics, routing                                                       | —     |
| QueryOptimizationService    | Slow query detection, optimization suggestions                                             | —     |
| DatabaseHealthService       | Health checks, automatic recovery                                                          | —     |
| BaseMongoRepository\<T\>    | Full CRUD, aggregation, transactions, bulk ops, soft delete, streaming, indexes, array ops | 792   |
| BasePostgresRepository\<T\> | Reusable TypeORM repository                                                                | —     |

**Query Operators:** eq, neq, gt, gte, lt, lte, in, nin, like, ilike, between, exists, isNull, regex, contains, startsWith, endsWith, arrayContains, arrayOverlap, jsonContains

**Performance Thresholds:** Slow query 200ms, Very slow query 1000ms, Max pool wait 5000ms, Health check interval 30s

### 5.3 @org.triply/amadeus

Custom-built, fully typed Amadeus API client (not the official SDK).

| Component     | Description                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| AmadeusModule | NestJS module (HttpModule + ConfigModule)                                                                  |
| AmadeusClient | Injectable service with OAuth2 client_credentials, token caching, typed HTTP methods                       |
| Shopping      | Flight offers search (GET/POST), flight dates, destinations, hotel offers, seatmaps, activities, transfers |
| Booking       | Flight orders, hotel bookings, hotel orders                                                                |
| ReferenceData | Airlines, locations (airports, cities, hotels, POIs), checkin links                                        |
| Travel        | Air traffic analytics, flight delay predictions, trip purpose predictions                                  |
| Airport       | Direct destinations, on-time performance                                                                   |
| Schedule      | Flight schedules                                                                                           |
| Ordering      | Transfer orders                                                                                            |
| Types         | 789-line shared.ts with comprehensive Amadeus API type definitions                                         |

---

## 6. API Specifications

### 6.1 Response Envelopes

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-27T10:00:00.000Z",
    "path": "/api/v1/flights/search",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Validation failed",
    "details": ["origin must be a 3-letter IATA code"]
  },
  "meta": {
    "timestamp": "2026-02-27T10:00:00.000Z",
    "path": "/api/v1/flights/search",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": {
    "timestamp": "2026-02-27T10:00:00.000Z",
    "path": "/api/v1/bookings",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 6.2 Existing Endpoints

#### Health

| Method | Path    | Auth   | Description               |
| ------ | ------- | ------ | ------------------------- |
| GET    | /health | Public | Application health status |
| GET    | /ready  | Public | Readiness probe           |

#### Flights

| Method | Path                           | Auth     | Description          |
| ------ | ------------------------------ | -------- | -------------------- |
| GET    | /api/v{version}/flights/search | Public\* | Search flight offers |

**Query Parameters (SearchFlightsDto):**

| Param       | Type   | Required | Validation                          |
| ----------- | ------ | -------- | ----------------------------------- |
| origin      | string | ✅       | 3-letter IATA code (`/^[A-Z]{3}$/`) |
| destination | string | ✅       | 3-letter IATA code (`/^[A-Z]{3}$/`) |
| date        | string | ✅       | ISO date (`YYYY-MM-DD`)             |
| adults      | string | ❌       | Numeric string (default: '1')       |

### 6.3 Planned Endpoint Groups

| Group         | Base Path             | Description                                      |
| ------------- | --------------------- | ------------------------------------------------ |
| Auth          | /api/v1/auth          | Login, register, refresh, logout, password reset |
| Users         | /api/v1/users         | Profile, preferences, travel documents           |
| Flights       | /api/v1/flights       | Search, offers, pricing, booking                 |
| Hotels        | /api/v1/hotels        | Search, offers, booking                          |
| Activities    | /api/v1/activities    | Search, book tours & experiences                 |
| Transfers     | /api/v1/transfers     | Airport transfer search & booking                |
| Bookings      | /api/v1/bookings      | Manage all booking types                         |
| Trips         | /api/v1/trips         | Trip itineraries, sharing                        |
| Payments      | /api/v1/payments      | Payment initiation, status, refunds              |
| Notifications | /api/v1/notifications | User notification preferences & history          |

---

## 7. Data Models & Storage

### 7.1 Database Strategy

| Data Type                                                          | Store      | Rationale                                                   |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------- |
| Users, bookings, payments, invoices                                | PostgreSQL | Strong consistency, relational integrity, ACID transactions |
| Search results cache, trip documents, analytics events             | MongoDB    | Schema flexibility, fast writes, aggregation pipelines      |
| Session cache, API response cache, rate limit counters, job queues | Redis      | Sub-millisecond reads, TTL-based expiry, pub/sub            |

### 7.2 Planned Entities (PostgreSQL)

| Entity         | Key Fields                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------- |
| User           | id, email, passwordHash, firstName, lastName, phone, role, status, emailVerifiedAt              |
| TravelDocument | id, userId, type (passport/visa/id), number, issuingCountry, expiryDate                         |
| Booking        | id, userId, type (flight/hotel/activity/transfer), status, referenceCode, totalAmount, currency |
| FlightBooking  | id, bookingId, pnr, airline, departureAirport, arrivalAirport, departureAt, arrivalAt           |
| HotelBooking   | id, bookingId, hotelId, checkIn, checkOut, roomType, guestCount                                 |
| Payment        | id, bookingId, provider, method, transactionRef, amount, currency, status, paidAt               |
| Invoice        | id, bookingId, invoiceNumber, amount, currency, issuedAt, dueAt                                 |
| Trip           | id, userId, name, startDate, endDate, status                                                    |
| TripItem       | id, tripId, bookingId, type, order                                                              |

### 7.3 Planned Documents (MongoDB)

| Collection       | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| search_results   | Cached Amadeus API responses (flights, hotels, activities) |
| price_alerts     | User price watch preferences and history                   |
| audit_logs       | System-wide audit trail                                    |
| analytics_events | User behavior and search analytics                         |
| notifications    | Notification delivery records                              |

### 7.4 Identifiers

| Entity         | ID Format                  | Generator                  |
| -------------- | -------------------------- | -------------------------- |
| Users, generic | UUID v4                    | `generateUUID()`           |
| Bookings       | `PNR-{9-char}`             | `generateBookingRef()`     |
| Orders         | `ORD-{10-char}`            | `generateOrderId()`        |
| Transactions   | 10-char M-PESA-style       | `generateTransactionRef()` |
| Invoices       | `INV-{year}-{seq}`         | `generateInvoiceNumber()`  |
| Sortable IDs   | `{prefix}_{unix}_{random}` | `generatePrefixedId()`     |
| OTPs           | 6-digit numeric            | `generateOTP()`            |

### 7.5 Monetary Values

- **Storage:** Integer minor units (cents/tambala/kobo) — never floating point
- **Arithmetic:** `preciseAdd`, `preciseSubtract`, `preciseMultiply`, `preciseDivide` (integer-scaled)
- **Rounding:** `bankersRound` for financial aggregations
- **Conversion:** BigInt-scaled exchange rates (×10^12 precision)
- **Formatting:** `formatMoney` via Intl.NumberFormat with locale-aware symbols

---

## 8. Authentication & Authorization

### 8.1 Current State

**Not yet implemented.** The `@Public()` decorator and `IS_PUBLIC_KEY` metadata key exist, but no auth guard, JWT strategy, or user module is in place. All routes are currently unprotected.

### 8.2 Planned Implementation

| Component        | Technology                                                       |
| ---------------- | ---------------------------------------------------------------- |
| Strategy         | JWT (access + refresh tokens) via @nestjs/jwt + @nestjs/passport |
| Password Hashing | @node-rs/bcrypt (Rust-backed)                                    |
| Token Storage    | Redis (refresh tokens with TTL)                                  |
| RBAC             | Custom decorator + guard reading role metadata                   |
| OAuth2           | Google, Apple Sign-In (planned)                                  |
| MFA              | TOTP via OTP generation (generateOTP from code.util.ts)          |

### 8.3 Planned Roles

| Role  | Permissions                                        |
| ----- | -------------------------------------------------- |
| user  | Search, book, manage own profile & trips           |
| agent | All user permissions + manage bookings for clients |
| admin | Full system access, user management, analytics     |

---

## 9. Third-Party Integrations

### 9.1 Amadeus API (Implemented)

| Capability              | Amadeus Endpoint                    | Status |
| ----------------------- | ----------------------------------- | ------ |
| Flight Search           | /v2/shopping/flight-offers          | ✅     |
| Flight Pricing          | /v1/shopping/flight-offers/pricing  | 🔲     |
| Flight Booking          | /v1/booking/flight-orders           | 🔲     |
| Hotel Search            | /v3/shopping/hotel-offers           | 🔲     |
| Hotel Booking           | /v2/booking/hotel-orders            | 🔲     |
| Airport Info            | /v1/reference-data/locations        | 🔲     |
| Airline Info            | /v1/reference-data/airlines         | 🔲     |
| Activities              | /v1/shopping/activities             | 🔲     |
| Transfers               | /v1/shopping/transfer-offers        | 🔲     |
| Seatmaps                | /v1/shopping/seatmaps               | 🔲     |
| Flight Delay Prediction | /v1/travel/predictions/flight-delay | 🔲     |

**Authentication:** OAuth2 client_credentials with auto-refresh (60s before expiry).

### 9.2 Planned Integrations

| Provider                  | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| Stripe                    | International card payments                |
| PayStack                  | African card payments                      |
| Flutterwave               | African card + mobile money                |
| M-PESA (Safaricom)        | Mobile money (Kenya)                       |
| Airtel Money              | Mobile money (multi-country)               |
| Infisical                 | Secrets management (SDK already installed) |
| SendGrid / Resend         | Transactional email                        |
| Twilio / Africa's Talking | SMS notifications                          |
| Firebase                  | Push notifications                         |
| Google Maps               | Location services, airport mapping         |
| Cloudinary / S3           | Media storage                              |

---

## 10. Security

### 10.1 Implemented

| Measure                | Implementation                                           |
| ---------------------- | -------------------------------------------------------- |
| HTTP Headers           | helmet() — CSP, HSTS, X-Frame-Options, etc.              |
| Rate Limiting          | @nestjs/throttler — global ThrottlerGuard (100 req/60s)  |
| CORS                   | Configurable origins, credentials, preflight caching     |
| Input Validation       | class-validator whitelist mode, forbidNonWhitelisted     |
| Input Sanitization     | stripHtml, escapeHtml, stripSqlChars, sanitize utilities |
| Timing-Safe Comparison | safeCompare (for token validation)                       |
| Correlation Tracking   | x-request-id on every request                            |
| Response Compression   | compression middleware                                   |
| Secrets Management     | Infisical SDK                                            |

### 10.2 Planned

| Measure            | Description                                    |
| ------------------ | ---------------------------------------------- |
| JWT Authentication | Access + refresh token pair                    |
| RBAC               | Role-based access control with guards          |
| CSRF Protection    | Token-based CSRF for state-changing operations |
| Request Signing    | HMAC signature verification for webhooks       |
| API Key Management | Per-client API keys for B2B access             |
| SSL Enforcement    | Fix RequestService SSL bypass for production   |
| Data Encryption    | Encrypt PII at rest                            |
| Audit Logging      | Track all sensitive operations                 |

---

## 11. Performance & Scalability

### 11.1 Caching Strategy

| Layer                  | Technology                  | TTL          | Use Case                    |
| ---------------------- | --------------------------- | ------------ | --------------------------- |
| Application Cache      | CacheService (Redis-backed) | Configurable | API response caching        |
| Database Query Cache   | QueryOptimizationService    | Per-query    | Frequently accessed queries |
| Amadeus Response Cache | SharedCacheModule           | 5-15 min     | Flight/hotel search results |
| Session Cache          | Redis                       | 24h          | User sessions               |

### 11.2 Queue Processing

| Queue                  | Purpose                  | Technology |
| ---------------------- | ------------------------ | ---------- |
| booking-confirmation   | Async booking processing | BullMQ     |
| email-notification     | Email delivery           | BullMQ     |
| sms-notification       | SMS delivery             | BullMQ     |
| payment-reconciliation | Payment status polling   | BullMQ     |
| search-analytics       | Search event processing  | BullMQ     |

### 11.3 Performance Monitoring

| Metric                | Threshold          |
| --------------------- | ------------------ |
| Slow query warning    | > 200ms            |
| Very slow query alert | > 1000ms           |
| Connection pool wait  | > 5000ms           |
| Health check interval | 30s                |
| Request timeout       | 30s (configurable) |

### 11.4 Concurrency

- `parallelLimit(fns, concurrency)` for controlled concurrent operations
- `withTimeout(fn, ms)` for deadline enforcement
- `retry(fn, options)` with exponential backoff for resilient external calls

---

## 12. Observability

### 12.1 Logging

| Component          | Implementation                                                          |
| ------------------ | ----------------------------------------------------------------------- |
| Request Logging    | RequestLoggerMiddleware (method, URL, status, duration, IP, user-agent) |
| Correlation IDs    | CorrelationIdMiddleware (x-request-id header)                           |
| Application Logger | NestJS Logger (env-based levels)                                        |
| Error Logging      | Exception filters with structured error output                          |

### 12.2 Health Checks

| Endpoint    | Response                                         |
| ----------- | ------------------------------------------------ |
| GET /health | { status, timestamp, uptime, environment, mode } |
| GET /ready  | { status: 'ready', timestamp }                   |

### 12.3 Planned

| Feature                 | Description                     |
| ----------------------- | ------------------------------- |
| Structured JSON Logging | JSON output for log aggregation |
| Distributed Tracing     | OpenTelemetry integration       |
| Metrics                 | Prometheus metrics endpoint     |
| Alerting                | Threshold-based alerts          |
| Dashboard               | Grafana dashboards              |

---

## 13. Deployment & Infrastructure

### 13.1 Environment Modes

| Variable | Values                                 | Effect                             |
| -------- | -------------------------------------- | ---------------------------------- |
| NODE_ENV | development, sandbox, production, test | Log levels, error details, Swagger |
| APP_MODE | sandbox, live                          | Swagger availability, API behavior |

**Swagger is enabled in:** development, sandbox, production+sandbox  
**Swagger is disabled in:** production+live

### 13.2 Environment Variables

See `PROMPT.txt` §11 for full list. Key categories:

- Common app config (PORT, API_PREFIX, CORS, throttling)
- Amadeus credentials (API_URL, API_KEY, API_SECRET)
- Database connections (Postgres, MongoDB, Redis)
- Payment service (PAYMENTS_PORT)

### 13.3 Build & Deploy

```bash
# Production build
npm run build:triply.api:prod
npm run build:triply.payments:prod

# Build outputs to dist/apps/{app-name}
```

---

## 14. Testing Strategy

### 14.1 Current State

No tests implemented yet. E2E test scaffolds exist for both apps.

### 14.2 Planned Test Pyramid

| Level       | Scope                           | Tool                   | Target Coverage |
| ----------- | ------------------------------- | ---------------------- | --------------- |
| Unit        | Pure functions, services        | Jest + @swc/jest       | 80%+            |
| Integration | Module interactions, DB queries | Jest + test containers | 70%+            |
| E2E         | Full API flows                  | Jest + supertest       | Critical paths  |

### 14.3 Priority Test Targets

1. **money.util.ts** — Financial calculations must be exact
2. **code.util.ts** — ID generation uniqueness and format validation
3. **hash.util.ts** — Cryptographic functions
4. **BaseMongoRepository** — All query operations
5. **AmadeusClient** — OAuth flow, request building, error handling
6. **FlightsService** — Search flow end-to-end
7. **Exception filters** — Error response format consistency

---

## 15. Feature Roadmap

### Phase 1: Foundation (Current)

- [x] NX workspace setup
- [x] Shared library (utils, middleware, pipes, filters, interceptors)
- [x] Database module (multi-DB support)
- [x] Amadeus client library
- [x] Flight search endpoint
- [x] Health checks
- [ ] Fix pre-existing build issues
- [ ] Wire DatabaseModule into AppModule
- [ ] Implement auth module (JWT + Passport)
- [ ] Implement user module
- [ ] Add unit tests for shared utilities

### Phase 2: Core Booking

- [ ] Flight pricing & booking flow
- [ ] Hotel search & booking
- [ ] Payment service integration (Stripe, PayStack)
- [ ] Mobile money integration (M-PESA)
- [ ] Booking management (view, cancel, modify)
- [ ] Invoice generation
- [ ] Email notifications (booking confirmations)

### Phase 3: Enhanced Features

- [ ] Activities & tours search/booking
- [ ] Airport transfers
- [ ] Trip itinerary management
- [ ] Price alerts (WebSocket)
- [ ] Search analytics
- [ ] User preferences & saved searches

### Phase 4: Scale & Optimize

- [ ] Amadeus response caching
- [ ] Queue-based async processing
- [ ] Distributed tracing
- [ ] Performance monitoring dashboards
- [ ] Multi-region deployment
- [ ] B2B API (travel agent access)

---

_This specification is a living document. Update it as features are implemented and requirements evolve._
