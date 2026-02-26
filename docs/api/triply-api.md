# Triply API Reference

## Overview

The Triply API is the main REST application built with NestJS. It serves as the backend for the Triply travel platform, providing endpoints for flight search, and (in future) hotel booking, user management, and more.

**Base URL:** `http://localhost:3000/api/v1`

## Global Configuration

### Prefix & Versioning

All routes are prefixed with `/api` and versioned via URI segments:

```
GET /api/v1/flights/search
        ^^^  ^^
        │    └── version
        └── prefix
```

Excluded from prefix: `/health`, `/ready`

### Authentication

Routes are public by default. Protected routes (future) will use JWT Bearer tokens:

```
Authorization: Bearer <jwt-token>
```

### Rate Limiting

All endpoints are protected by a global rate limiter:

- **Window:** 60 seconds (configurable via `THROTTLE_TTL`)
- **Limit:** 100 requests per window per client (configurable via `THROTTLE_LIMIT`)

Response when exceeded:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### Validation

All request bodies and query parameters are validated using `class-validator`:

- **Whitelist mode:** Unknown properties are stripped.
- **Forbid non-whitelisted:** Unknown properties throw `400 Bad Request`.
- **Transform:** Query params are auto-coerced to their declared types.

## Endpoints

### Health Check

#### `GET /health`

Returns the application health status.

**Response:** `200 OK`

---

#### `GET /ready`

Returns readiness status for load balancer probes.

**Response:** `200 OK`

---

### Flights

#### `GET /api/v1/flights/search`

Search for flight offers using the Amadeus API.

**Query Parameters:**

| Parameter     | Type   | Required | Example      | Description                               |
| ------------- | ------ | -------- | ------------ | ----------------------------------------- |
| `origin`      | string | Yes      | `JFK`        | IATA origin airport code (3 letters)      |
| `destination` | string | Yes      | `LAX`        | IATA destination airport code             |
| `date`        | string | Yes      | `2026-06-15` | Departure date (`YYYY-MM-DD`)             |
| `adults`      | string | No       | `2`          | Number of adult passengers (default: `1`) |

**Validation Rules:**

- `origin` and `destination` must match `/^[A-Z]{3}$/`
- `date` must match `/^\d{4}-\d{2}-\d{2}$/`
- `adults` must be a numeric string

**Example Request:**

```bash
curl "http://localhost:3000/api/v1/flights/search?origin=JFK&destination=LAX&date=2026-06-15&adults=2"
```

**Success Response:** `200 OK`

Returns the Amadeus flight offers response (see [Amadeus Flight Offers Search API](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search)).

**Error Responses:**

| Status | Description                                    |
| ------ | ---------------------------------------------- |
| `400`  | Invalid search parameters (validation failure) |
| `429`  | Rate limit exceeded                            |
| `500`  | Amadeus API error or internal server error     |

## Swagger / OpenAPI

Interactive API documentation is available when `APP_MODE=sandbox`:

**URL:** `http://localhost:3000/api/docs`

Features:

- Try-it-out for all endpoints
- Persistent authorization (JWT token saved across page reloads)
- Alphabetically sorted tags and operations
- Filterable endpoint list

Swagger is **automatically disabled** in production live mode.

## Error Response Format

All errors follow a consistent shape:

```json
{
  "statusCode": 400,
  "message": "origin must be a valid 3-letter IATA code",
  "error": "Bad Request"
}
```

In production, error messages are minimal to avoid leaking internal details.

## Modules

### Current

| Module    | Path                | Description                     |
| --------- | ------------------- | ------------------------------- |
| `Flights` | `/flights/*`        | Flight offer search via Amadeus |
| `Health`  | `/health`, `/ready` | Application health checks       |

### Planned

| Module     | Path          | Description                           |
| ---------- | ------------- | ------------------------------------- |
| `Hotels`   | `/hotels/*`   | Hotel search and booking              |
| `Bookings` | `/bookings/*` | Trip booking management               |
| `Users`    | `/users/*`    | User registration and profiles        |
| `Auth`     | `/auth/*`     | Authentication (login, register, JWT) |
| `Payments` | `/payments/*` | Payment processing                    |

## Next Steps

- [Database Library →](../libraries/database.md)
- [Shared Library →](../libraries/shared.md)
- [Configuration →](../getting-started/configuration.md)
