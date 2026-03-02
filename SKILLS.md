# Triply Backend — Skills & Capabilities Reference

> A complete inventory of every reusable skill, utility, service, pattern, and
> building block available in the Triply backend codebase. Use this file to
> avoid reimplementing existing functionality.

---

## Table of Contents

1. [Cryptography & Security](#1-cryptography--security)
2. [Input Sanitization](#2-input-sanitization)
3. [Code & ID Generation](#3-code--id-generation)
4. [Money & Currency](#4-money--currency)
5. [Date & Time](#5-date--time)
6. [String Manipulation](#6-string-manipulation)
7. [Math & Precision Arithmetic](#7-math--precision-arithmetic)
8. [Array Operations](#8-array-operations)
9. [Object Utilities](#9-object-utilities)
10. [Async & Concurrency](#10-async--concurrency)
11. [Caching](#11-caching)
12. [Retry & Resilience](#12-retry--resilience)
13. [Pagination](#13-pagination)
14. [Slug Generation](#14-slug-generation)
15. [HTTP Client](#15-http-client)
16. [Database Operations](#16-database-operations)
17. [Amadeus Travel API](#17-amadeus-travel-api)
18. [API Response Envelopes](#18-api-response-envelopes)
19. [Request Pipeline](#19-request-pipeline)
20. [Health Monitoring](#20-health-monitoring)
21. [Configuration & Environment](#21-configuration--environment)
22. [NestJS Patterns](#22-nestjs-patterns)

---

## 1. Cryptography & Security

**Source:** `libs/shared/src/lib/utils/hash.util.ts`

| Skill                   | Function                                     | Description                                                                 |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| SHA-256 Hashing         | `sha256(data: string): string`               | Generate hex-encoded SHA-256 digest                                         |
| Secure Token Generation | `generateToken(bytes?: number): string`      | Cryptographically secure random hex token (default 32 bytes = 64 hex chars) |
| Timing-Safe Comparison  | `safeCompare(a: string, b: string): boolean` | Constant-time string comparison to prevent timing attacks                   |

**When to use:**

- `sha256` — Hashing API keys, webhook signatures, data integrity checks
- `generateToken` — Creating password reset tokens, email verification tokens, API keys
- `safeCompare` — Comparing tokens, passwords, HMAC signatures

---

## 2. Input Sanitization

**Source:** `libs/shared/src/lib/utils/sanitize.util.ts`

| Skill                    | Function                                                     | Description                                                          |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Strip HTML               | `stripHtml(str: string): string`                             | Remove all HTML tags                                                 |
| Escape HTML              | `escapeHtml(str: string): string`                            | Escape `<>&"'` to HTML entities                                      |
| Strip SQL Characters     | `stripSqlChars(str: string): string`                         | Remove characters used in SQL injection                              |
| Strip Special Characters | `stripSpecialChars(str: string, allowList?: string): string` | Remove non-alphanumeric characters (with optional allow list)        |
| Sanitize Filename        | `sanitizeFileName(name: string): string`                     | Make filenames filesystem-safe                                       |
| General Sanitize         | `sanitize(str: string, maxLength?: number): string`          | Strip HTML + collapse whitespace + enforce max length (default 1000) |

**When to use:**

- User-submitted text fields → `sanitize()`
- Displaying user content → `escapeHtml()`
- File uploads → `sanitizeFileName()`
- Database queries with raw strings → `stripSqlChars()`

---

## 3. Code & ID Generation

**Source:** `libs/shared/src/lib/utils/code.util.ts`

| Skill                 | Function                              | Output Format                | Example                  |
| --------------------- | ------------------------------------- | ---------------------------- | ------------------------ |
| Transaction Reference | `generateTransactionRef(length?)`     | `[Year][Month][Day][Random]` | `MCB7K3X2PA`             |
| Order ID              | `generateOrderId(prefix?)`            | `{prefix}-{10-char ref}`     | `ORD-MCB7K3X2PA`         |
| Booking Reference     | `generateBookingRef(prefix?)`         | `{prefix}-{9-char ref}`      | `PNR-MCB7K3X2P`          |
| One-Time Password     | `generateOTP(length?)`                | Numeric string               | `847291`                 |
| Short ID              | `generateShortId(length?)`            | URL-safe alphanumeric        | `x7Kp2mNq`               |
| UUID v4               | `generateUUID()`                      | Standard UUID                | `550e8400-e29b-41d4-...` |
| Prefixed Sortable ID  | `generatePrefixedId(prefix, len?)`    | `{prefix}_{unix}_{random}`   | `usr_1709042400_a8x3k2`  |
| Invoice Number        | `generateInvoiceNumber(seq, prefix?)` | `{prefix}-{year}-{seq}`      | `INV-2026-00042`         |

| Validation               | Function                           | Description              |
| ------------------------ | ---------------------------------- | ------------------------ |
| Validate Transaction Ref | `isValidTransactionRef(ref, len?)` | Check format validity    |
| Luhn Check Digit         | `luhnCheckDigit(numStr)`           | Compute Luhn check digit |
| Validate Luhn            | `isValidLuhn(numStr)`              | Validate Luhn checksum   |

**ID Assignment Guide:**

- Users, generic entities → `generateUUID()`
- Bookings → `generateBookingRef('PNR')`
- Orders → `generateOrderId('ORD')`
- Payment transactions → `generateTransactionRef()`
- Invoices → `generateInvoiceNumber(sequenceNumber)`
- Sortable records → `generatePrefixedId('evt')`
- Verification codes → `generateOTP(6)`
- Short URLs, slugs → `generateShortId(8)`

---

## 4. Money & Currency

**Source:** `libs/shared/src/lib/utils/money.util.ts` (705 lines)

### 4.1 Core Types

```typescript
interface Money {
  amount: number;
  currency: string;
} // amount in minor units
interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  _scaled: bigint;
  timestamp?: string;
  source?: string;
}
```

### 4.2 Currency Support

**100+ currencies configured** in `CURRENCY_CONFIG` with `{ decimals, symbol, locale }`:

| Region      | Currencies                                                                                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Major       | USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD, SGD                                                                                                                                                            |
| African     | KES, MWK, ZAR, NGN, TZS, UGX, RWF, ZMW, GHS, EGP, MAD, DZD, TND, LYD, SDG, ETB, AOA, XOF, XAF, BWP, MZN, NAD, MUR, SCR, GMD, SLL, LRD, CVE, SZL, LSL, MGA, KMF, DJF, ERN, SOS, SSP, STN, BIF, CDF, GNF, MRU, ZWL |
| European    | SEK, NOK, DKK, ISK, PLN, CZK, HUF, RON, BGN, HRK, RSD, UAH, RUB, BYN, MDL, ALL, MKD, BAM, GEL, AMD, AZN, TRY                                                                                                     |
| Asian       | INR, PKR, BDT, LKR, NPR, BTN, MVR, AFN, THB, VND, IDR, MYR, PHP, MMK, KHR, LAK, BND, TWD, KRW, KPW, MNT, KZT, UZS, TJS, KGS, TMT                                                                                 |
| Middle East | SAR, AED, QAR, KWD, BHD, OMR, JOD, ILS, LBP, SYP, IQD, IRR, YER                                                                                                                                                  |
| Americas    | MXN, BRL, ARS, CLP, COP, PEN, VES, UYU, PYG, BOB, GTQ, HNL, NIO, CRC, PAB, DOP, CUP, JMD, HTG, TTD, BBD, BSD, BZD, GYD, SRD, AWG                                                                                 |

### 4.3 Skills

| Skill               | Function                           | Description                                             |
| ------------------- | ---------------------------------- | ------------------------------------------------------- |
| Create Money        | `money(amount, currency)`          | Create Money from major units (e.g. 10.50 → 1050 cents) |
| Create from Minor   | `moneyFromMinor(amount, currency)` | Create Money from minor units directly                  |
| Convert Major→Minor | `toMinorUnits(major, currency)`    | 10.50 USD → 1050                                        |
| Convert Minor→Major | `toMajorUnits(minor, currency)`    | 1050 → 10.50                                            |
| Add                 | `addMoney(a, b)`                   | Precision-safe addition (same currency)                 |
| Subtract            | `subtractMoney(a, b)`              | Precision-safe subtraction                              |
| Multiply            | `multiplyMoney(m, factor)`         | Multiply by scalar                                      |
| Percentage          | `percentOf(m, percent)`            | Calculate percentage of amount                          |
| Split               | `splitMoney(m, parts)`             | Split with remainder distribution                       |
| Format              | `formatMoney(m)`                   | Locale-aware: "MK 1,050.00"                             |
| Format Numeric      | `formatMoneyNumeric(m)`            | Plain numeric: "10.50"                                  |
| Check Zero          | `isZero(m)`                        | True if amount is 0                                     |
| Check Positive      | `isPositive(m)`                    | True if amount > 0                                      |
| Check Negative      | `isNegative(m)`                    | True if amount < 0                                      |
| Compare             | `compareMoney(a, b)`               | -1, 0, or 1 (same currency)                             |

### 4.4 Currency Conversion (BigInt Precision)

| Skill        | Function                                | Description                                      |
| ------------ | --------------------------------------- | ------------------------------------------------ |
| Create Rate  | `exchangeRate(from, to, rate, source?)` | Create ExchangeRate with BigInt scaling (×10^12) |
| Convert      | `convertMoney(money, rate)`             | Precise currency conversion                      |
| Inverse Rate | `inverseRate(rate)`                     | Flip from↔to                                     |
| Cross Rate   | `crossRate(rateA, rateB)`               | Derive rate via common currency                  |
| Apply Spread | `applySpread(rate, spreadPercent)`      | Apply buy/sell spread                            |
| Mid Rate     | `midRate(buy, sell)`                    | Calculate midpoint rate                          |
| Spread %     | `spreadPercent(buy, sell)`              | Calculate spread percentage                      |
| Format Rate  | `formatRate(rate, precision?)`          | Display-friendly rate string                     |

---

## 5. Date & Time

**Source:** `libs/shared/src/lib/utils/datetime.util.ts` (wraps date-fns)

### 5.1 Parsing & Formatting

| Skill                 | Function                      | Output                              |
| --------------------- | ----------------------------- | ----------------------------------- |
| Parse                 | `toDate(input)`               | Date object from string/number/Date |
| Format Date           | `formatDate(date)`            | `2026-02-27`                        |
| Format DateTime       | `formatDateTime(date)`        | `2026-02-27 10:30:00`               |
| Format Human Date     | `formatDateHuman(date)`       | `27 Feb 2026`                       |
| Format Human DateTime | `formatDateTimeHuman(date)`   | `27 Feb 2026, 10:30 AM`             |
| Format Time           | `formatTime(date)`            | `10:30`                             |
| Format 12h Time       | `formatTime12h(date)`         | `10:30 AM`                          |
| Relative Time         | `timeAgo(date)`               | `3 hours ago`                       |
| Duration              | `durationBetween(start, end)` | `2h 15m`                            |

### 5.2 Differences

| Skill        | Function              | Returns |
| ------------ | --------------------- | ------- |
| Diff Seconds | `diffInSeconds(a, b)` | number  |
| Diff Minutes | `diffInMinutes(a, b)` | number  |
| Diff Hours   | `diffInHours(a, b)`   | number  |
| Diff Days    | `diffInDays(a, b)`    | number  |

### 5.3 Checks

| Skill             | Function                         | Description                     |
| ----------------- | -------------------------------- | ------------------------------- |
| Is After          | `isAfter(a, b)`                  | True if a is after b            |
| Is Before         | `isBefore(a, b)`                 | True if a is before b           |
| Is Future         | `isFuture(date)`                 | True if date is in the future   |
| Is Past           | `isPast(date)`                   | True if date is in the past     |
| Is Same Day       | `isSameDay(a, b)`                | True if same calendar day       |
| Is Today          | `isToday(date)`                  | True if today                   |
| Is Weekend        | `isWeekend(date)`                | True if Saturday or Sunday      |
| Is Expired        | `isExpired(date)`                | True if date is before now      |
| Is Within Minutes | `isWithinMinutes(date, minutes)` | True if within N minutes of now |

### 5.4 Manipulation

| Skill              | Function                                    |
| ------------------ | ------------------------------------------- |
| Add/Sub Days       | `addDays(date, n)` / `subDays(date, n)`     |
| Add/Sub Hours      | `addHours(date, n)` / `subHours(date, n)`   |
| Add/Sub Minutes    | `addMinutes(date, n)`                       |
| Add/Sub Weeks      | `addWeeks(date, n)` / `subWeeks(date, n)`   |
| Add/Sub Months     | `addMonths(date, n)` / `subMonths(date, n)` |
| Start/End of Day   | `startOfDay(date)` / `endOfDay(date)`       |
| Start/End of Week  | `startOfWeek(date)` / `endOfWeek(date)`     |
| Start/End of Month | `startOfMonth(date)` / `endOfMonth(date)`   |

### 5.5 Ranges & Timestamps

| Skill          | Function                | Description              |
| -------------- | ----------------------- | ------------------------ |
| Date Range     | `dateRange(start, end)` | Inclusive array of Dates |
| Now UTC        | `nowUTC()`              | Current UTC Date         |
| Unix Timestamp | `unixTimestamp(date?)`  | Seconds since epoch      |
| From Unix      | `fromUnixTimestamp(ts)` | Date from unix seconds   |

---

## 6. String Manipulation

**Source:** `libs/shared/src/lib/utils/string.util.ts`

| Skill                | Function                          | Example                         |
| -------------------- | --------------------------------- | ------------------------------- |
| Capitalize           | `capitalize(str)`                 | `hello` → `Hello`               |
| Title Case           | `titleCase(str)`                  | `hello world` → `Hello World`   |
| camelCase            | `camelCase(str)`                  | `hello_world` → `helloWorld`    |
| snake_case           | `snakeCase(str)`                  | `helloWorld` → `hello_world`    |
| kebab-case           | `kebabCase(str)`                  | `helloWorld` → `hello-world`    |
| Truncate             | `truncate(str, maxLen, suffix?)`  | `Hello...`                      |
| Mask                 | `mask(str, visible?, char?)`      | `****5678`                      |
| Mask Email           | `maskEmail(email)`                | `j***@example.com`              |
| Mask Phone           | `maskPhone(phone)`                | `*****6789`                     |
| Strip Whitespace     | `stripWhitespace(str)`            | Remove all whitespace           |
| Normalize Whitespace | `normalizeWhitespace(str)`        | Collapse multiple spaces to one |
| Validate Email       | `isEmail(str)`                    | Lightweight regex check         |
| Validate URL         | `isUrl(str)`                      | URL constructor check           |
| Initials             | `initials(name, max?)`            | `John Doe` → `JD`               |
| Pluralize            | `pluralize(word, count, plural?)` | `1 item` / `2 items`            |
| Pad Start            | `padStart(val, len, char?)`       | `42` → `0042`                   |

**Source:** `libs/shared/src/lib/utils/slug.util.ts`

| Skill   | Function        | Example                        |
| ------- | --------------- | ------------------------------ |
| Slugify | `slugify(text)` | `Hello World!` → `hello-world` |

---

## 7. Math & Precision Arithmetic

**Source:** `libs/shared/src/lib/utils/math.util.ts`

### 7.1 Precision Arithmetic (IEEE 754 safe)

| Skill            | Function                          | Description                               |
| ---------------- | --------------------------------- | ----------------------------------------- |
| Precise Add      | `preciseAdd(a, b)`                | 0.1 + 0.2 = 0.3 (not 0.30000000000000004) |
| Precise Subtract | `preciseSubtract(a, b)`           | Exact subtraction                         |
| Precise Multiply | `preciseMultiply(a, b)`           | Exact multiplication                      |
| Precise Divide   | `preciseDivide(a, b, precision?)` | Division with configurable precision      |
| Decimal Places   | `decimalPlaces(n)`                | Count decimals in a number                |

### 7.2 Rounding

| Skill             | Function                        | Description                             |
| ----------------- | ------------------------------- | --------------------------------------- |
| Banker's Round    | `bankersRound(n, decimals?)`    | Round half-to-even (financial standard) |
| Truncate Decimals | `truncateDecimals(n, decimals)` | Chop without rounding                   |
| Ceil To           | `ceilTo(n, decimals)`           | Round up to N decimals                  |
| Floor To          | `floorTo(n, decimals)`          | Round down to N decimals                |
| Round To          | `roundTo(n, decimals)`          | Standard rounding to N decimals         |

### 7.3 Comparison & Clamping

| Skill        | Function                      | Description                       |
| ------------ | ----------------------------- | --------------------------------- |
| Nearly Equal | `nearlyEqual(a, b, epsilon?)` | Float comparison within tolerance |
| Clamp        | `clamp(value, min, max)`      | Constrain to range                |

### 7.4 Statistics & Calculations

| Skill             | Function                     | Description              |
| ----------------- | ---------------------------- | ------------------------ |
| Random Int        | `randomInt(min, max)`        | Inclusive random integer |
| Random Float      | `randomFloat(min, max)`      | Random float in range    |
| Percentage        | `percentage(part, whole)`    | Calculate percentage     |
| Percentage Change | `percentageChange(old, new)` | Calculate % change       |
| Sum               | `sum(numbers)`               | Array sum                |
| Average           | `average(numbers)`           | Array average            |
| Median            | `median(numbers)`            | Array median             |

### 7.5 Geography

| Skill              | Function                                    | Description                 |
| ------------------ | ------------------------------------------- | --------------------------- |
| To Radians         | `toRadians(degrees)`                        | Degrees to radians          |
| Haversine Distance | `haversineDistance(lat1, lng1, lat2, lng2)` | Great-circle distance in km |

---

## 8. Array Operations

**Source:** `libs/shared/src/lib/utils/array.util.ts`

| Skill           | Function                        | Description                          |
| --------------- | ------------------------------- | ------------------------------------ |
| Unique          | `unique(arr)`                   | Remove duplicates                    |
| Chunk           | `chunk(arr, size)`              | Split into fixed-size chunks         |
| Flatten         | `flattenArray(arr)`             | Deep flatten nested arrays           |
| Intersection    | `intersection(a, b)`            | Elements in both arrays              |
| Difference      | `difference(a, b)`              | Elements in a but not b              |
| Sort By         | `sortBy(arr, key, order?)`      | Sort by property                     |
| Partition       | `partition(arr, predicate)`     | Split into [match, noMatch]          |
| Find With Index | `findWithIndex(arr, predicate)` | Return { item, index }               |
| Shuffle         | `shuffle(arr)`                  | Fisher-Yates shuffle (new array)     |
| Take            | `take(arr, n)`                  | First n elements                     |
| Take Last       | `takeLast(arr, n)`              | Last n elements                      |
| To Map          | `toMap(arr, key)`               | Array → Map by property              |
| Count By        | `countBy(arr, key)`             | Count occurrences by property        |
| Zip             | `zip(a, b)`                     | Pair elements from two arrays        |
| Is Empty        | `isEmpty(arr)`                  | True if null/undefined/empty         |
| Sample          | `sample(arr)`                   | Random single element                |
| Sample N        | `sampleN(arr, n)`               | Random n elements (no repeats)       |
| Min By          | `minBy(arr, key)`               | Element with smallest property value |
| Max By          | `maxBy(arr, key)`               | Element with largest property value  |

---

## 9. Object Utilities

**Source:** `libs/shared/src/lib/utils/object.util.ts`

| Skill            | Function                           | Description                                            |
| ---------------- | ---------------------------------- | ------------------------------------------------------ |
| Deep Clone       | `deepClone(obj)`                   | structuredClone-based deep copy                        |
| Pick             | `pick(obj, keys)`                  | Select specific keys                                   |
| Omit             | `omit(obj, keys)`                  | Exclude specific keys                                  |
| Compact          | `compact(obj)`                     | Remove null/undefined values                           |
| Flatten          | `flatten(obj)`                     | Nested → dot-notation keys (`{a:{b:1}}` → `{'a.b':1}`) |
| Get Nested Value | `getNestedValue(obj, path)`        | Access deep property by dot-path                       |
| Set Nested Value | `setNestedValue(obj, path, value)` | Set deep property by dot-path                          |
| Deep Merge       | `deepMerge(target, ...sources)`    | Recursive object merge                                 |
| Group By         | `groupBy(arr, key)`                | Group array items by property                          |
| Key By           | `keyBy(arr, key)`                  | Array → lookup object by property                      |

---

## 10. Async & Concurrency

**Source:** `libs/shared/src/lib/utils/async.util.ts`

| Skill          | Function                          | Description                                         |
| -------------- | --------------------------------- | --------------------------------------------------- |
| Sleep          | `sleep(ms)`                       | Pause execution for N milliseconds                  |
| With Timeout   | `withTimeout(fn, ms)`             | Run async function with deadline; throws on timeout |
| Parallel Limit | `parallelLimit(fns, concurrency)` | Execute async functions with max concurrency        |

**When to use:**

- `sleep` — Rate limiting, polling delays, test utilities
- `withTimeout` — External API calls that must not hang
- `parallelLimit` — Batch processing (e.g., 10 concurrent Amadeus requests)

---

## 11. Caching

**Source:** `libs/shared/src/lib/utils/cache.util.ts`

### 11.1 CacheService (Injectable)

| Skill        | Method                   | Description                                           |
| ------------ | ------------------------ | ----------------------------------------------------- |
| Get          | `get<T>(key)`            | Retrieve cached value                                 |
| Multi-Get    | `mget<T>(...keys)`       | Retrieve multiple values                              |
| Set          | `set(key, value, ttl?)`  | Store value with optional TTL                         |
| Multi-Set    | `mset(pairs, ttl?)`      | Store multiple values                                 |
| Delete       | `del(key)`               | Remove cached value                                   |
| Multi-Delete | `mdel(...keys)`          | Remove multiple values                                |
| Clear        | `clear()`                | Flush entire cache                                    |
| TTL          | `ttl(key)`               | Get remaining TTL                                     |
| Wrap         | `wrap<T>(key, fn, ttl?)` | Cache-aside pattern: return cached or compute + cache |
| Disconnect   | `disconnect()`           | Close cache connection                                |

### 11.2 Module Registration

```typescript
SharedCacheModule.register({ ttl: 300, max: 1000, isGlobal: true });
```

### 11.3 Cache Key Builder

```typescript
buildCacheKey('flights', 'search', 'JFK-LAX-2026-06-15');
// → 'flights:search:JFK-LAX-2026-06-15'
```

---

## 12. Retry & Resilience

**Source:** `libs/shared/src/lib/utils/retry.util.ts`

| Skill | Function              | Description                                   |
| ----- | --------------------- | --------------------------------------------- |
| Retry | `retry(fn, options?)` | Retry async function with exponential backoff |

**Options:**

| Option      | Default | Description                                                   |
| ----------- | ------- | ------------------------------------------------------------- |
| maxAttempts | 3       | Maximum number of attempts                                    |
| delayMs     | 1000    | Initial delay between retries                                 |
| backoff     | true    | Enable exponential backoff (delay doubles each retry)         |
| onRetry     | —       | Callback invoked before each retry `(error, attempt) => void` |

**When to use:**

- Amadeus API calls that may fail transiently
- Payment gateway requests
- Database operations during connection recovery
- Any external HTTP call

---

## 13. Pagination

**Source:** `libs/shared/src/lib/utils/pagination.util.ts`

| Skill          | Function                                                        | Description                              |
| -------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Build Meta     | `buildPaginationMeta(page, limit, total)`                       | Compute totalPages, hasNext, hasPrevious |
| Build Response | `paginatedResponse(data, page, limit, total, path, requestId?)` | Full PaginatedResponse envelope          |

**Source:** `libs/shared/src/lib/dto/pagination-query.dto.ts`

| Skill     | Class                | Description                                                              |
| --------- | -------------------- | ------------------------------------------------------------------------ |
| Query DTO | `PaginationQueryDto` | Validated page (default 1) + limit (default 20, max 100) + computed skip |

---

## 14. Slug Generation

**Source:** `libs/shared/src/lib/utils/slug.util.ts`

| Skill   | Function        | Description                                                       |
| ------- | --------------- | ----------------------------------------------------------------- |
| Slugify | `slugify(text)` | URL-safe slug: lowercase, hyphen-delimited, special chars removed |

---

## 15. HTTP Client

**Source:** `libs/shared/src/lib/services/request.service.ts` (731 lines)

### RequestService (Injectable)

| Skill                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| GET/POST/PUT/PATCH/DELETE  | Full HTTP method support                         |
| Content-Type Negotiation   | Auto-selects JSON, form-urlencoded, or multipart |
| Bearer Token Injection     | Automatically adds Authorization header          |
| Query String Serialization | Uses `qs` library for complex query params       |
| Per-Request Timing         | Logs request duration                            |
| Retry with Backoff         | Configurable retry for failed requests           |
| Health Check Ping          | Simple reachability check                        |
| Binary Download            | Stream/buffer download support                   |
| Error Handling             | Structured error logging with request context    |

**Module:** `SharedModule` (imports ConfigModule + HttpModule, exports RequestService)

---

## 16. Database Operations

**Source:** `libs/database/`

### 16.1 Connection Management

| Skill                | Service                               | Description                                       |
| -------------------- | ------------------------------------- | ------------------------------------------------- |
| Multi-DB Config      | `DatabaseModule.forRoot/forRootAsync` | Configure Postgres, MongoDB, Redis simultaneously |
| Feature Registration | `DatabaseModule.forFeature`           | Register models/repos per feature module          |
| Connection Pooling   | `ConnectionManagerService`            | Pool management, metrics, routing                 |
| Health Monitoring    | `DatabaseHealthService`               | Auto-recovery, health checks every 30s            |
| Query Optimization   | `QueryOptimizationService`            | Slow query detection (>200ms warn, >1s alert)     |

### 16.2 MongoDB Repository (BaseMongoRepository\<T\>)

| Skill            | Method                                  | Description                                         |
| ---------------- | --------------------------------------- | --------------------------------------------------- |
| Find Many        | `find(options?)`                        | With filters, pagination, sorting, search, populate |
| Find One         | `findOne(filter)`                       | Single document                                     |
| Find By ID       | `findById(id)`                          | By ObjectId                                         |
| Count            | `count(filter?)`                        | Document count                                      |
| Exists           | `exists(filter)`                        | Boolean existence check                             |
| Create           | `create(data)`                          | Insert one                                          |
| Create Many      | `createMany(data[])`                    | Insert batch                                        |
| Update           | `update(id, data)`                      | Update one                                          |
| Update Many      | `updateMany(filter, data)`              | Bulk update                                         |
| Delete           | `delete(id)`                            | Hard delete one                                     |
| Delete Many      | `deleteMany(filter)`                    | Bulk hard delete                                    |
| Soft Delete      | `softDelete(id)`                        | Mark as deleted (preserves data)                    |
| Restore          | `restore(id)`                           | Undo soft delete                                    |
| Paginate         | `paginate(options)`                     | Full pagination with meta                           |
| Search           | `search(options)`                       | Full-text search with fuzzy matching                |
| Aggregate        | `aggregate(options)`                    | GroupBy with count/sum/avg/min/max                  |
| Pipeline         | `aggregatePipeline(stages)`             | Raw aggregation pipeline                            |
| Pipeline Builder | `pipeline()`                            | Fluent aggregation builder                          |
| Transactions     | `withTransaction(fn)`                   | Atomic multi-document operations                    |
| Bulk Write       | `bulkWrite(ops)`                        | Mixed insert/update/delete batch                    |
| Bulk Upsert      | `bulkUpsert(docs, matchField)`          | Insert or update in batch                           |
| Batch Process    | `batchProcess(filter, fn, batchSize)`   | Process large datasets in chunks                    |
| Stream           | `stream(filter)`                        | Cursor-based iteration for large datasets           |
| Distinct         | `distinct(field, filter?)`              | Unique values for a field                           |
| Find Or Create   | `findOrCreate(filter, data)`            | Atomic find-or-insert                               |
| Upsert           | `upsert(filter, data)`                  | Atomic update-or-insert                             |
| Text Index       | `createTextIndex(fields, options?)`     | Create MongoDB text index                           |
| Compound Index   | `createCompoundIndex(fields, options?)` | Create compound index                               |
| Drop Index       | `dropIndex(name)`                       | Remove index                                        |
| Get Indexes      | `getIndexes()`                          | List all indexes                                    |
| Increment        | `increment(id, field, amount?)`         | Atomic numeric increment                            |
| Decrement        | `decrement(id, field, amount?)`         | Atomic numeric decrement                            |
| Push             | `push(id, field, value)`                | Add to array                                        |
| Pull             | `pull(id, field, value)`                | Remove from array                                   |
| Add To Set       | `addToSet(id, field, value)`            | Add to array (no duplicates)                        |

### 16.3 Query Operators

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `ilike`, `between`, `exists`, `isNull`, `regex`, `contains`, `startsWith`, `endsWith`, `arrayContains`, `arrayOverlap`, `jsonContains`

Django-style lookups supported: `field__exact`, `field__gt`, `field__contains`, etc.

---

## 17. Amadeus Travel API

**Source:** `libs/amadeus/`

### 17.1 Client (AmadeusClient — Injectable)

| Skill                 | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| OAuth2 Authentication | Auto client_credentials flow with token caching (refreshes 60s before expiry) |
| Typed HTTP Methods    | `get<T>(path, params)`, `post<T>(path, data)`, `delete<T>(path, params)`      |
| Request Tracking      | Ama-Client-Ref header with timestamp                                          |

### 17.2 Travel API Namespaces

| Namespace                           | Skills                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------- |
| **shopping.flightOffersSearch**     | `get(params)` — search flights; `post(params)` — advanced multi-city search |
| **shopping.flightDates**            | Cheapest flight dates                                                       |
| **shopping.flightDestinations**     | Cheapest destinations from origin                                           |
| **shopping.flightOffers**           | Flight pricing, prediction, upselling                                       |
| **shopping.hotelOffersSearch**      | Hotel search                                                                |
| **shopping.hotelOfferSearch(id)**   | Specific hotel offer details                                                |
| **shopping.seatmaps**               | Aircraft seat maps                                                          |
| **shopping.activities**             | Tours & activities search                                                   |
| **shopping.activity(id)**           | Specific activity details                                                   |
| **shopping.availability**           | Flight availability                                                         |
| **shopping.transferOffers**         | Airport transfer search                                                     |
| **booking.flightOrders**            | Create flight bookings                                                      |
| **booking.flightOrder(id)**         | Manage specific flight booking                                              |
| **booking.hotelBookings**           | Create hotel bookings                                                       |
| **booking.hotelOrders**             | Manage hotel orders                                                         |
| **referenceData.airlines**          | Airline information lookup                                                  |
| **referenceData.locations**         | Airport, city, hotel, POI search                                            |
| **referenceData.urls**              | Airline checkin links                                                       |
| **travel.analytics**                | Air traffic stats (booked, traveled, busiest)                               |
| **travel.predictions**              | Flight delay & trip purpose predictions                                     |
| **airport.directDestinations**      | Direct flight destinations from airport                                     |
| **airport.predictions**             | On-time performance                                                         |
| **airline.destinations**            | Airline route network                                                       |
| **schedule.flights**                | Flight schedules                                                            |
| **analytics.itineraryPriceMetrics** | Price benchmarking                                                          |
| **eReputation.hotelSentiments**     | Hotel review sentiment analysis                                             |
| **media.files**                     | Media file access                                                           |
| **ordering.transferOrders**         | Create transfer orders                                                      |
| **ordering.transferOrder(id)**      | Manage transfer orders                                                      |
| **location.analytics**              | Category-rated areas                                                        |
| **pagination**                      | Generic result pagination                                                   |

### 17.3 Types Available

789-line shared type definitions including: `FlightOffer`, `FlightOrder`, `Segment`, `FlightSegment`, `Price`, `ExtendedPrice`, `Traveler`, `Contact`, `Address`, `BaggageAllowance`, `FareRules`, `CurrencyCode` (24 currencies), `TravelClass`, `TravelerType`, `FormOfPayment`, `CreditCard`, `TicketingAgreement`, `Dictionaries`, `Locations`, `GeoCode`, `Distance`, `HotelProductDepositPolicy`, and many more.

---

## 18. API Response Envelopes

**Source:** `libs/shared/src/lib/interfaces/api-response.interface.ts`

| Skill               | Interface               | Use Case                                                       |
| ------------------- | ----------------------- | -------------------------------------------------------------- |
| Success Response    | `ApiSuccessResponse<T>` | `{ success: true, data: T, meta }`                             |
| Error Response      | `ApiErrorResponse`      | `{ success: false, error: { code, message, details? }, meta }` |
| Paginated Response  | `PaginatedResponse<T>`  | `{ success: true, data: T[], pagination, meta }`               |
| Response Metadata   | `ApiResponseMeta`       | `{ timestamp, path, requestId? }`                              |
| Pagination Metadata | `PaginationMeta`        | `{ page, limit, total, totalPages, hasNext, hasPrevious }`     |

---

## 19. Request Pipeline

### 19.1 Middleware

**Source:** `libs/shared/src/lib/middleware/`

| Skill           | Class                     | Description                                                   |
| --------------- | ------------------------- | ------------------------------------------------------------- |
| Correlation ID  | `CorrelationIdMiddleware` | Ensures x-request-id on every request (UUID v4 fallback)      |
| Request Logging | `RequestLoggerMiddleware` | Structured log: method, URL, status, duration, IP, user-agent |

### 19.2 Pipes

**Source:** `libs/shared/src/lib/pipes/`

| Skill              | Class                  | Description                                                   |
| ------------------ | ---------------------- | ------------------------------------------------------------- |
| Trim Strings       | `TrimStringPipe`       | Auto-trim whitespace from string inputs (deep object support) |
| Parse Optional Int | `ParseOptionalIntPipe` | String → int with undefined pass-through                      |

### 19.3 Interceptors

**Source:** `libs/shared/src/lib/interceptors/`

| Skill           | Class                | Description                                    |
| --------------- | -------------------- | ---------------------------------------------- |
| Request Timeout | `TimeoutInterceptor` | Configurable timeout (default 30s), throws 408 |

### 19.4 Filters

**Source:** `libs/shared/src/lib/filters/`

| Skill                 | Class                 | Description                                                   |
| --------------------- | --------------------- | ------------------------------------------------------------- |
| HTTP Exception Filter | `HttpExceptionFilter` | Standardized ApiErrorResponse for HttpException               |
| All Exceptions Filter | `AllExceptionsFilter` | Catch-all for unhandled errors, stack trace in non-production |

### 19.5 Decorators

**Source:** `libs/shared/src/lib/decorators/`

| Skill                  | Decorator                      | Description                                          |
| ---------------------- | ------------------------------ | ---------------------------------------------------- |
| Public Route           | `@Public()`                    | Bypass authentication guards                         |
| Request ID Extraction  | `@RequestId()`                 | Extract x-request-id as parameter                    |
| Paginated Swagger Docs | `@ApiPaginatedResponse(Model)` | Auto-generate Swagger schema for paginated endpoints |

---

## 20. Health Monitoring

**Source:** `libs/shared/src/lib/health/`

| Skill           | Endpoint      | Response                                           |
| --------------- | ------------- | -------------------------------------------------- |
| Health Check    | `GET /health` | `{ status, timestamp, uptime, environment, mode }` |
| Readiness Probe | `GET /ready`  | `{ status: 'ready', timestamp }`                   |

Both endpoints bypass rate limiting via `@SkipThrottle()`.

---

## 21. Configuration & Environment

**Source:** `libs/shared/src/lib/config/`

| Skill              | Function/Constant      | Description                                            |
| ------------------ | ---------------------- | ------------------------------------------------------ |
| Base Env Schema    | `baseEnvSchema`        | Typed env var definitions with defaults (arkenv)       |
| App Config Factory | `createAppConfig(env)` | NestJS `registerAs('app', ...)` with computed booleans |
| Environment Enum   | `Environment`          | Development, Sandbox, Production, Test                 |
| App Mode Enum      | `AppMode`              | Sandbox, Live                                          |
| Validation Adapter | `validate(config)`     | ConfigModule validate function                         |

**Source:** `libs/shared/src/lib/constants/`

| Skill               | Constant              | Values                             |
| ------------------- | --------------------- | ---------------------------------- |
| Pagination Defaults | `PAGINATION_DEFAULTS` | PAGE: 1, LIMIT: 20, MAX_LIMIT: 100 |
| CORS Defaults       | `CORS_DEFAULTS`       | Methods, headers, maxAge: 3600     |
| Rate Limit Defaults | `RATE_LIMIT_DEFAULTS` | TTL: 60s, LIMIT: 100               |
| Request Timeout     | `REQUEST_TIMEOUT_MS`  | 30,000ms                           |

---

## 22. NestJS Patterns

Available architectural patterns already established in this codebase:

| Pattern                       | Example                                               | Location               |
| ----------------------------- | ----------------------------------------------------- | ---------------------- |
| Dynamic Module (forRoot)      | `DatabaseModule.forRoot(options)`                     | libs/database          |
| Dynamic Module (forRootAsync) | `DatabaseModule.forRootAsync({ useFactory, inject })` | libs/database          |
| Dynamic Module (forFeature)   | `DatabaseModule.forFeature({ models })`               | libs/database          |
| Global Module                 | `@Global() DatabaseModule`                            | libs/database          |
| Global Guard                  | `{ provide: APP_GUARD, useClass: ThrottlerGuard }`    | triply.api             |
| Global Validation Pipe        | `app.useGlobalPipes(new ValidationPipe({...}))`       | triply.api main.ts     |
| Global Exception Filter       | `app.useGlobalFilters(new HttpExceptionFilter())`     | triply.api main.ts     |
| Custom Param Decorator        | `@RequestId()`                                        | libs/shared decorators |
| Metadata Decorator            | `@Public()`                                           | libs/shared decorators |
| Swagger Composition           | `@ApiPaginatedResponse(Model)`                        | libs/shared decorators |
| Namespaced Service            | `AmadeusClient.shopping.flightOffersSearch.get()`     | libs/amadeus           |
| Repository Pattern            | `BaseMongoRepository<T>`                              | libs/database          |
| DTO Validation                | `SearchFlightsDto` with class-validator               | triply.api flights     |
| Config Namespace              | `registerAs('app', () => ({...}))`                    | libs/shared config     |
| Event Emitter                 | `EventEmitterModule.forRoot()`                        | triply.api             |

---

_Use this document as a lookup table before writing new code. If a skill exists here, import and reuse it rather than reimplementing._
