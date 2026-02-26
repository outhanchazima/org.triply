# Amadeus Library (`@org.triply/amadeus`)

## Overview

Custom NestJS wrapper around the [Amadeus Self-Service APIs](https://developers.amadeus.com/self-service). Provides a fully typed, namespaced client for flight search, hotel booking, airport data, travel analytics, and more — all powered by `@nestjs/axios` with automatic OAuth2 token management.

**Import:** `@org.triply/amadeus`

## Quick Start

```typescript
import { AmadeusModule, AmadeusClient } from '@org.triply/amadeus';

// 1. Import the module
@Module({
  imports: [AmadeusModule],
})
export class FlightsModule {}

// 2. Inject the client
@Injectable()
export class FlightsService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async searchFlights(origin: string, destination: string, date: string) {
    return this.amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: 1,
    });
  }
}
```

## Module Configuration

`AmadeusModule` imports `HttpModule` and `ConfigModule` and exports `AmadeusClient`.

**Required environment variables:**

| Variable             | Description                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| `AMADEUS_API_URL`    | Base URL — `https://test.api.amadeus.com` (sandbox) or `https://api.amadeus.com` (live) |
| `AMADEUS_API_KEY`    | Your Amadeus API key                                                                    |
| `AMADEUS_API_SECRET` | Your Amadeus API secret                                                                 |

## AmadeusClient Service

The `AmadeusClient` is a NestJS `@Injectable()` service that manages:

- **OAuth2 token lifecycle** — tokens are cached and refreshed 60 seconds before expiry.
- **Namespaced API resources** — each Amadeus API domain is exposed as a typed property.
- **HTTP call delegation** — all requests go through `@nestjs/axios` (`HttpService`).

### Authentication Flow

```
AmadeusClient.getAccessToken()
  │
  ├─ Token cached and not expired? → Return cached token
  │
  └─ POST /v1/security/oauth2/token
       Body: grant_type=client_credentials&client_id=...&client_secret=...
       │
       └─ Cache token, set expiry (response.expires_in - 60s)
```

## API Namespaces

### `amadeus.shopping`

Flight and hotel offer search.

| Resource                                   | Method | Description                       |
| ------------------------------------------ | ------ | --------------------------------- |
| `flightOffersSearch.get()`                 | GET    | Search flight offers              |
| `flightOffersSearch.post()`                | POST   | Search with advanced criteria     |
| `flightOffers.pricing.post()`              | POST   | Price selected flight offers      |
| `flightOffers.prediction.post()`           | POST   | Predict flight choice probability |
| `flightOffers.upselling.post()`            | POST   | Get upselling offers              |
| `flightDates.get()`                        | GET    | Cheapest flight dates             |
| `flightDestinations.get()`                 | GET    | Cheapest flight destinations      |
| `seatmaps.get()`                           | GET    | Seat map for a flight offer       |
| `hotelOffersSearch.get()`                  | GET    | Search hotel offers               |
| `hotelOfferSearch.get()`                   | GET    | Get specific hotel offer details  |
| `activities.get()`                         | GET    | Tours & activities by location    |
| `activities.bySquare.get()`                | GET    | Tours & activities by geo square  |
| `activity.get()`                           | GET    | Specific activity details         |
| `transferOffers.post()`                    | POST   | Search transfer offers            |
| `availability.flightAvailabilities.post()` | POST   | Flight seat availability          |

### `amadeus.booking`

Create and manage bookings.

| Resource                   | Method | Description                     |
| -------------------------- | ------ | ------------------------------- |
| `flightOrders.post()`      | POST   | Create a flight order (booking) |
| `flightOrder(id).get()`    | GET    | Retrieve a flight order         |
| `flightOrder(id).delete()` | DELETE | Cancel a flight order           |
| `hotelBookings.post()`     | POST   | Create a hotel booking          |
| `hotelOrders.post()`       | POST   | Create a hotel order            |

### `amadeus.referenceData`

Static reference data.

| Resource                                    | Method | Description                         |
| ------------------------------------------- | ------ | ----------------------------------- |
| `airlines.get()`                            | GET    | Airline information by IATA code    |
| `location(id).get()`                        | GET    | Location details by ID              |
| `locations.get()`                           | GET    | Search locations (airports, cities) |
| `locations.airports.get()`                  | GET    | Nearest airports by geo coordinates |
| `locations.cities.get()`                    | GET    | City search                         |
| `locations.hotel.get()`                     | GET    | Hotel by ID                         |
| `locations.hotels.byCity.get()`             | GET    | Hotels in a city                    |
| `locations.hotels.byGeocode.get()`          | GET    | Hotels near coordinates             |
| `locations.hotels.byHotels.get()`           | GET    | Hotels by IDs                       |
| `locations.pointsOfInterest.get()`          | GET    | POIs by coordinates                 |
| `locations.pointsOfInterest.bySquare.get()` | GET    | POIs in geo square                  |
| `locations.pointOfInterest(id).get()`       | GET    | Specific POI                        |
| `recommendedLocations.get()`                | GET    | Recommended destinations            |
| `urls.checkinLinks.get()`                   | GET    | Airline check-in links              |

### `amadeus.travel`

Travel analytics and predictions.

| Resource                                   | Method | Description                |
| ------------------------------------------ | ------ | -------------------------- |
| `analytics.airTraffic.traveled.get()`      | GET    | Air traffic by destination |
| `analytics.airTraffic.booked.get()`        | GET    | Booked air traffic data    |
| `analytics.airTraffic.busiestPeriod.get()` | GET    | Busiest travel periods     |
| `predictions.flightDelay.get()`            | GET    | Flight delay prediction    |
| `predictions.tripPurpose.get()`            | GET    | Trip purpose prediction    |

### `amadeus.airport`

Airport-specific data.

| Resource                   | Method | Description                      |
| -------------------------- | ------ | -------------------------------- |
| `directDestinations.get()` | GET    | Direct destinations from airport |
| `predictions.onTime.get()` | GET    | Airport on-time performance      |

### `amadeus.airline`

Airline-specific data.

| Resource             | Method | Description                       |
| -------------------- | ------ | --------------------------------- |
| `destinations.get()` | GET    | Destinations served by an airline |

### `amadeus.analytics`

Price analytics.

| Resource                      | Method | Description                        |
| ----------------------------- | ------ | ---------------------------------- |
| `itineraryPriceMetrics.get()` | GET    | Historical itinerary price metrics |

### `amadeus.eReputation`

Hotel sentiment analysis.

| Resource                | Method | Description                  |
| ----------------------- | ------ | ---------------------------- |
| `hotelSentiments.get()` | GET    | Hotel guest sentiment scores |

### `amadeus.media`

Media resources.

| Resource      | Method | Description                       |
| ------------- | ------ | --------------------------------- |
| `files.get()` | GET    | AI-generated photos for locations |

### `amadeus.ordering`

Transfer and transport ordering.

| Resource                                       | Method | Description           |
| ---------------------------------------------- | ------ | --------------------- |
| `transferOrder(id).get()`                      | GET    | Get transfer order    |
| `transferOrders.post()`                        | POST   | Create transfer order |
| `transferOrders.transfers.cancellation.post()` | POST   | Cancel a transfer     |

### `amadeus.schedule`

Flight schedules.

| Resource        | Method | Description                       |
| --------------- | ------ | --------------------------------- |
| `flights.get()` | GET    | Flight schedule by route and date |

### `amadeus.location`

Location analytics.

| Resource                             | Method | Description                    |
| ------------------------------------ | ------ | ------------------------------ |
| `analytics.categoryRatedAreas.get()` | GET    | Neighbourhood safety & ratings |

### `amadeus.pagination`

Pagination helper for multi-page API results.

| Resource     | Method | Description                |
| ------------ | ------ | -------------------------- |
| `next()`     | GET    | Fetch next page of results |
| `previous()` | GET    | Fetch previous page        |
| `first()`    | GET    | Fetch first page           |
| `last()`     | GET    | Fetch last page            |

## Type Exports

The library exports TypeScript types for all API request/response shapes, organised by domain:

- `types/access-token.ts` — OAuth2 token response
- `types/errors.ts` — Amadeus error response structure
- `types/pagination.ts` — Pagination metadata
- `types/shared.ts` — Common shared types
- `types/shopping/*` — Flight offers, hotel offers, activities, seatmaps
- `types/booking/*` — Flight orders, hotel bookings
- `types/reference-data/*` — Locations, airlines, hotels, POIs
- `types/travel/*` — Air traffic, predictions
- `types/airport/*` — Direct destinations, on-time predictions
- `types/airline/*` — Airline destinations
- `types/analytics/*` — Price metrics
- `types/e-reputation/*` — Hotel sentiments
- `types/location/*` — Category rated areas
- `types/ordering/*` — Transfer orders
- `types/schedule/*` — Flight schedules

## Error Handling

Amadeus API errors are thrown as standard NestJS `HttpException` instances. The original Amadeus error response body is preserved in the exception payload.

```typescript
try {
  const offers = await this.amadeus.shopping.flightOffersSearch.get(params);
} catch (error) {
  // error.getStatus()   → HTTP status code from Amadeus
  // error.getResponse() → Amadeus error body
}
```

## Next Steps

- [Shared Library →](./shared.md)
- [Utils Library →](./utils.md)
