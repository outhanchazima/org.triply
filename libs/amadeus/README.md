# @org.triply/amadeus

A comprehensive TypeScript/NestJS wrapper for the Amadeus Travel API, providing a clean and type-safe interface for accessing Amadeus services including flights, hotels, travel analytics, and more.

## 📋 Table of Contents

- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🏃‍♂️ Quick Start](#️-quick-start)
- [📚 API Reference](#-api-reference)
- [💡 Usage Examples](#-usage-examples)
- [🔧 Type Definitions](#-type-definitions)
- [🚨 Error Handling](#-error-handling)
- [🛠️ Development](#️-development)
- [📝 Contributing](#-contributing)

## � Installation

This library is part of the `@org.triply` monorepo and should be installed as a workspace dependency.

```bash
# If using in another project within the monorepo
npm install @org.triply/amadeus
```

## ⚙️ Configuration

### Environment Variables

Configure the following environment variables:

```env
AMADEUS_API_URL=https://api.amadeus.com
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret
```

### NestJS Module Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmadeusModule } from '@org.triply/amadeus';

@Module({
  imports: [
    ConfigModule.forRoot(), // Ensure ConfigModule is imported
    AmadeusModule,
  ],
})
export class AppModule {}
```

## 🏃‍♂️ Quick Start

### Basic Service Injection

```typescript
import { Injectable } from '@nestjs/common';
import AmadeusClient from '@org.triply/amadeus';

@Injectable()
export class TravelService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async searchFlights() {
    const response = await this.amadeus.shopping.flightOffersSearch.get({
      origin: 'NYC',
      destination: 'LAX',
      departureDate: '2024-12-25',
      adults: 1,
    });
    
    return response.data;
  }
}
```

### Direct Client Usage

```typescript
import AmadeusClient from '@org.triply/amadeus';

// Initialize client (when not using NestJS DI)
const amadeus = new AmadeusClient(httpService, configService);

// Search for flights
const flights = await amadeus.shopping.flightOffersSearch.get({
  origin: 'NYC',
  destination: 'LAX', 
  departureDate: '2024-12-25',
  adults: 1
});
```

## 📚 API Reference

The library is organized into several namespaced clients, each corresponding to different Amadeus API categories:

### 🛫 Airlines

```typescript
// Get airline destinations
const destinations = await amadeus.airline.destinations.get({
  airlineCode: 'BA'
});
```

### 📊 Analytics

```typescript
// Get itinerary price metrics
const metrics = await amadeus.analytics.itineraryPriceMetrics.get({
  originIataCode: 'NYC',
  destinationIataCode: 'LAX',
  departureDate: '2024-12-25'
});
```

### ✈️ Airport

```typescript
// Get airport direct destinations
const destinations = await amadeus.airport.directDestination.get({
  departureAirportCode: 'NYC'
});

// Get on-time performance predictions
const onTime = await amadeus.airport.predictions.onTime.get({
  airportCode: 'NYC',
  date: '2024-12-25'
});
```

### � Booking

```typescript
// Create flight order
const flightOrder = await amadeus.booking.flightOrders.post({
  data: {
    type: 'flight-order',
    flightOffers: [...],
    travelers: [...]
  }
});

// Create hotel booking
const hotelBooking = await amadeus.booking.hotelBookings.post({
  data: {
    offerId: 'HOTEL_OFFER_ID',
    guests: [...],
    payments: [...]
  }
});
```

### 🏨 E-Reputation

```typescript
// Get hotel sentiment analysis
const sentiments = await amadeus.eReputation.hotelSentiments.get({
  hotelIds: ['HOTEL_ID_1', 'HOTEL_ID_2']
});
```

### 📍 Location

```typescript
// Get category-rated areas
const areas = await amadeus.location.analytics.categoryRatedAreas.get({
  latitude: 41.397158,
  longitude: 2.160873
});
```

### 🎬 Media

```typescript
// Access media files (placeholder for future implementation)
const files = amadeus.media.files;
```

### 🚚 Ordering

```typescript
// Create transfer order
const transferOrder = await amadeus.ordering.transferOrders.post({
  data: {
    // transfer order data
  }
});

// Cancel transfer
const cancellation = await amadeus.ordering.transferOrder('ORDER_ID').transfers.cancellation.post({
  data: {
    confirmNbr: 'CONFIRMATION_NUMBER'
  }
});
```

### 📖 Reference Data

```typescript
// Get airlines
const airlines = await amadeus.referenceData.airlines.get({
  airlineCodes: 'BA,AF'
});

// Search locations
const locations = await amadeus.referenceData.locations.get({
  keyword: 'Paris',
  subType: 'AIRPORT'
});

// Get airports near location
const airports = await amadeus.referenceData.locations.airports.get({
  latitude: 49.0000,
  longitude: 2.55
});

// Search cities
const cities = await amadeus.referenceData.locations.cities.get({
  keyword: 'Paris'
});

// Get hotels by city
const hotels = await amadeus.referenceData.locations.hotels.byCity.get({
  cityCode: 'PAR'
});

// Get points of interest
const poi = await amadeus.referenceData.locations.pointsOfInterest.get({
  latitude: 41.397158,
  longitude: 2.160873
});
```

### 📅 Schedule

```typescript
// Get flight schedules
const schedules = await amadeus.schedule.flights.get({
  carrierCode: 'AZ',
  flightNumber: '319',
  scheduledDepartureDate: '2024-12-25'
});
```

### 🛒 Shopping

```typescript
// Flight offers search
const flightOffers = await amadeus.shopping.flightOffersSearch.get({
  origin: 'NYC',
  destination: 'LAX',
  departureDate: '2024-12-25',
  adults: 1
});

// Hotel offers search
const hotelOffers = await amadeus.shopping.hotelOffersSearch.get({
  cityCode: 'PAR',
  checkInDate: '2024-12-25',
  checkOutDate: '2024-12-27'
});

// Activities search
const activities = await amadeus.shopping.activities.get({
  latitude: 41.397158,
  longitude: 2.160873
});

// Flight pricing
const pricing = await amadeus.shopping.flightOffers.pricing.post({
  data: {
    type: 'flight-offers-pricing',
    flightOffers: [...]
  }
});

// Seat maps
const seatMaps = await amadeus.shopping.seatMaps.get({
  flightOfferId: 'FLIGHT_OFFER_ID'
});
```

### 🌍 Travel

```typescript
// Air traffic analytics
const booked = await amadeus.travel.analytics.airTraffic.booked.get({
  originCityCode: 'NYC',
  period: '2024-12'
});

const traveled = await amadeus.travel.analytics.airTraffic.traveled.get({
  originCityCode: 'NYC',
  destinationCityCode: 'LAX',
  period: '2024-12'
});

// Flight delay predictions
const flightDelay = await amadeus.travel.predictions.flightDelay.get({
  originLocationCode: 'NYC',
  destinationLocationCode: 'LAX',
  departureDate: '2024-12-25',
  departureTime: '18:20:00',
  arrivalDate: '2024-12-25',
  arrivalTime: '21:15:00',
  aircraftCode: '321',
  carrierCode: 'DL',
  flightNumber: '1234',
  duration: 'PT6H55M'
});

// Trip purpose prediction
const tripPurpose = await amadeus.travel.predictions.tripPurpose.get({
  originLocationCode: 'NYC',
  destinationLocationCode: 'LAX',
  departureDate: '2024-12-25',
  returnDate: '2024-12-30'
});
```

## 💡 Usage Examples

### Complete Flight Booking Flow

```typescript
@Injectable()
export class FlightBookingService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async bookFlight() {
    try {
      // 1. Search for flights
      const flightSearch = await this.amadeus.shopping.flightOffersSearch.get({
        origin: 'NYC',
        destination: 'LAX',
        departureDate: '2024-12-25',
        adults: 1,
        max: 5
      });

      const selectedOffer = flightSearch.data.data[0];

      // 2. Get pricing details
      const pricing = await this.amadeus.shopping.flightOffers.pricing.post({
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [selectedOffer]
        }
      });

      // 3. Create booking
      const booking = await this.amadeus.booking.flightOrders.post({
        data: {
          type: 'flight-order',
          flightOffers: pricing.data.data.flightOffers,
          travelers: [{
            id: '1',
            name: {
              firstName: 'John',
              lastName: 'Doe'
            },
            gender: 'MALE',
            contact: {
              emailAddress: 'john.doe@example.com',
              phones: [{
                deviceType: 'MOBILE',
                countryCallingCode: '1',
                number: '2345678901'
              }]
            },
            documents: [{
              documentType: 'PASSPORT',
              number: 'A1234567',
              expiryDate: '2030-01-01',
              issuanceCountry: 'US',
              nationality: 'US',
              holder: true
            }]
          }]
        }
      });

      return {
        success: true,
        bookingId: booking.data.data.id,
        confirmation: booking.data.data
      };

    } catch (error) {
      throw new Error(`Flight booking failed: ${error.message}`);
    }
  }
}
```

### Hotel Search and Booking

```typescript
@Injectable()
export class HotelBookingService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async searchAndBookHotel() {
    try {
      // 1. Search hotels by city
      const hotelSearch = await this.amadeus.shopping.hotelOffersSearch.get({
        cityCode: 'PAR',
        checkInDate: '2024-12-25',
        checkOutDate: '2024-12-27',
        adults: 2,
        currency: 'EUR'
      });

      const selectedHotel = hotelSearch.data.data[0];

      // 2. Get specific hotel offer
      const hotelOffer = await this.amadeus.shopping.hotelOfferSearch.get({
        offerId: selectedHotel.offers[0].id
      });

      // 3. Book the hotel
      const booking = await this.amadeus.booking.hotelBookings.post({
        data: {
          offerId: hotelOffer.data.data.offers[0].id,
          guests: [{
            name: {
              firstName: 'Jane',
              lastName: 'Smith'
            },
            contact: {
              email: 'jane.smith@example.com',
              phone: '+1234567890'
            }
          }],
          payments: [{
            method: 'CREDIT_CARD',
            card: {
              vendorCode: 'VI',
              cardNumber: '4111111111111111',
              expiryDate: '2026-12'
            }
          }]
        }
      });

      return {
        success: true,
        bookingId: booking.data.data.id,
        hotelDetails: booking.data.data
      };

    } catch (error) {
      throw new Error(`Hotel booking failed: ${error.message}`);
    }
  }
}
```

### Travel Analytics Dashboard

```typescript
@Injectable()
export class TravelAnalyticsService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async getTravelInsights(origin: string, destination: string) {
    try {
      const [
        airTrafficBooked,
        airTrafficTraveled,
        priceMetrics,
        flightDelayPrediction
      ] = await Promise.all([
        this.amadeus.travel.analytics.airTraffic.booked.get({
          originCityCode: origin,
          period: '2024-12'
        }),
        this.amadeus.travel.analytics.airTraffic.traveled.get({
          originCityCode: origin,
          destinationCityCode: destination,
          period: '2024-12'
        }),
        this.amadeus.analytics.itineraryPriceMetrics.get({
          originIataCode: origin,
          destinationIataCode: destination,
          departureDate: '2024-12-25'
        }),
        this.amadeus.travel.predictions.flightDelay.get({
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate: '2024-12-25',
          departureTime: '18:20:00',
          arrivalDate: '2024-12-25',
          arrivalTime: '21:15:00',
          aircraftCode: '321',
          carrierCode: 'DL',
          flightNumber: '1234',
          duration: 'PT6H55M'
        })
      ]);

      return {
        airTraffic: {
          booked: airTrafficBooked.data,
          traveled: airTrafficTraveled.data
        },
        pricing: priceMetrics.data,
        delayPrediction: flightDelayPrediction.data
      };

    } catch (error) {
      throw new Error(`Analytics retrieval failed: ${error.message}`);
    }
  }
}
```

## 🔧 Type Definitions

The library includes comprehensive TypeScript definitions for all API endpoints:

### Core Types

```typescript
import {
  // Response types
  AmadeusResponse,
  
  // Shared types
  FlightOffer,
  TravelClass,
  Price,
  Traveler,
  
  // Error types
  ErrorCodes,
  
  // Pagination types
  CollectionMeta,
  CollectionLinks
} from '@org.triply/amadeus';
```

### Domain-Specific Types

```typescript
// Flight-related types
import {
  FlightOffersSearchGetParams,
  FlightOffersSearchGetResult,
  FlightOrderCreateParams
} from '@org.triply/amadeus';

// Hotel-related types
import {
  HotelOffersSearchParams,
  HotelBookingParams,
  HotelOffersSearchResult
} from '@org.triply/amadeus';

// Analytics types
import {
  ItineraryPriceMetricsParams,
  AirTrafficBookedParams,
  FlightDelayPredictionParams
} from '@org.triply/amadeus';
```

## 🚨 Error Handling

The library provides structured error handling:

```typescript
import { AmadeusResponse, ErrorCodes } from '@org.triply/amadeus';

try {
  const response = await amadeus.shopping.flightOffersSearch.get(params);
  return response.data;
} catch (error) {
  // Handle specific error types
  if (error.code === 'AuthenticationError') {
    // Handle authentication issues
  } else if (error.code === 'NetworkError') {
    // Handle network issues
  } else if (error.code === 'ClientError') {
    // Handle client-side errors (4xx)
  } else if (error.code === 'ServerError') {
    // Handle server-side errors (5xx)
  }
  
  throw error;
}
```

### Common Error Codes

- `NetworkError`: Network connectivity issues
- `AuthenticationError`: API key/secret authentication failures
- `ClientError`: Invalid request parameters (4xx responses)
- `ServerError`: Amadeus API server errors (5xx responses)
- `NotFoundError`: Resource not found (404)
- `ParserError`: Response parsing issues
- `UnknownError`: Unexpected errors

## 🧪 Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AmadeusModule } from '@org.triply/amadeus';

describe('AmadeusService', () => {
  let service: AmadeusClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        AmadeusModule,
      ],
    }).compile();

    service = module.get<AmadeusClient>(AmadeusClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search flights', async () => {
    const result = await service.shopping.flightOffersSearch.get({
      origin: 'NYC',
      destination: 'LAX',
      departureDate: '2024-12-25',
      adults: 1,
    });

    expect(result.data).toBeDefined();
    expect(result.statusCode).toBe(200);
  });
});
```

## 🛠️ Development

### Running Unit Tests

Run `nx test amadeus` to execute the unit tests via Jest.

### Building the Library

Run `nx build amadeus` to build the library.

### Linting

Run `nx lint amadeus` to lint the library code.

## 📝 Contributing

1. Follow TypeScript best practices
2. Add comprehensive JSDoc comments
3. Include type definitions for all parameters and return types
4. Write unit tests for new functionality
5. Update this README for new features

## 📄 License

This library is part of the `@org.triply` monorepo and follows the project's licensing terms.

## 🔗 Related Links

- [Amadeus for Developers](https://developers.amadeus.com/)
- [Amadeus API Documentation](https://developers.amadeus.com/api-docs)
- [NestJS Documentation](https://nestjs.com/)

---

**Note**: This library requires valid Amadeus API credentials. Sign up at [Amadeus for Developers](https://developers.amadeus.com/) to get your API key and secret.
