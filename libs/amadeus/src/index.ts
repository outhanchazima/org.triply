// Module exports
export * from './lib/amadeus.module';

// Service exports
export * from './lib/services/amadeus-client.service';
export { default as AmadeusClient } from './lib/services/amadeus-client.service';

// Client exports - Airlines
export * from './lib/client/airline/destinations';
export * from './lib/client/airline/index';

// Client exports - Analytics
export * from './lib/client/analytics/index';
export * from './lib/client/analytics/itinerary-price-metrics';

// Client exports - Airport
export * from './lib/client/airport/direct-destination';
export * from './lib/client/airport/index';
export * from './lib/client/airport/predictions/index';
export * from './lib/client/airport/predictions/on-time';

// Client exports - Booking
export * from './lib/client/booking/flight-order';
export * from './lib/client/booking/flight-orders';
export * from './lib/client/booking/hotel-bookings';
export * from './lib/client/booking/hotel-orders';
export * from './lib/client/booking/index';

// Client exports - E-reputation
export * from './lib/client/e-reputation/hotel-sentiments';
export * from './lib/client/e-reputation/index';

// Client exports - Location
export * from './lib/client/location/analytics/category-rated-areas';
export * from './lib/client/location/analytics/index';
export * from './lib/client/location/index';

// Client exports - Media
export * from './lib/client/media/files';
export * from './lib/client/media/index';

// Client exports - Ordering
export * from './lib/client/ordering/index';
export * from './lib/client/ordering/transfer-order';
export * from './lib/client/ordering/transfer-orders/index';
export * from './lib/client/ordering/transfer-orders/transfers/cancellation';
export * from './lib/client/ordering/transfer-orders/transfers/index';

// Client exports - Reference Data
export * from './lib/client/reference-data/airlines';
export * from './lib/client/reference-data/index';
export * from './lib/client/reference-data/location';
export * from './lib/client/reference-data/locations/airports';
export * from './lib/client/reference-data/locations/cities';
export * from './lib/client/reference-data/locations/hotel';
export * from './lib/client/reference-data/locations/hotels/by-city';
export * from './lib/client/reference-data/locations/hotels/by-geocode';
export * from './lib/client/reference-data/locations/hotels/by-hotels';
export * from './lib/client/reference-data/locations/hotels/index';
export * from './lib/client/reference-data/locations/index';
export * from './lib/client/reference-data/locations/points-of-interest/by-square';
export * from './lib/client/reference-data/locations/points-of-interest/index';
export * from './lib/client/reference-data/locations/points-of-interest/poi';
export * from './lib/client/reference-data/recommended-locations';
export * from './lib/client/reference-data/urls/checkin-links';
export * from './lib/client/reference-data/urls/index';

// Client exports - Schedule
export * from './lib/client/schedule/flights';
export * from './lib/client/schedule/index';

// Client exports - Shopping
export * from './lib/client/shopping/activities/by-square';
export * from './lib/client/shopping/activities/index';
export * from './lib/client/shopping/activity';
export * from './lib/client/shopping/availability/flight-availabilities';
export * from './lib/client/shopping/availability/index';
export * from './lib/client/shopping/flight-dates';
export * from './lib/client/shopping/flight-destinations';
export * from './lib/client/shopping/flight-offers-search';
export * from './lib/client/shopping/flight_offers/flight-choice-prediction';
export * from './lib/client/shopping/flight_offers/index';
export * from './lib/client/shopping/flight_offers/pricing';
export * from './lib/client/shopping/flight_offers/upselling';
export * from './lib/client/shopping/hotel-offer-search';
export * from './lib/client/shopping/hotel-offers-search';
export * from './lib/client/shopping/index';
export * from './lib/client/shopping/seatmaps';
export * from './lib/client/shopping/transfer-offers';

// Client exports - Travel
export * from './lib/client/travel/analytics/air-traffic/booked';
export * from './lib/client/travel/analytics/air-traffic/busiest-period';
export * from './lib/client/travel/analytics/air-traffic/index';
export * from './lib/client/travel/analytics/air-traffic/traveled';
export * from './lib/client/travel/analytics/index';
export * from './lib/client/travel/index';
export * from './lib/client/travel/predictions/flight-delay';
export * from './lib/client/travel/predictions/index';
export * from './lib/client/travel/predictions/trip-purpose';

// Core client exports
export * from './lib/client/flight-offers-search';
export * from './lib/client/pagination';

// Type exports - Access Token
export * from './lib/types/access-token';

// Type exports - Analytics
export * from './lib/types/analytics/itinerary-price-metrics';

// Type exports - Airline
export * from './lib/types/airline/destinations';

// Type exports - Airport
export * from './lib/types/airport/direct-destination';
export * from './lib/types/airport/predictions/on-time';

// Type exports - Booking
export * from './lib/types/booking/flight-order';
export * from './lib/types/booking/flight-orders';
export * from './lib/types/booking/hotel-bookings';
export * from './lib/types/booking/hotel-orders';

// Type exports - E-reputation
export * from './lib/types/e-reputation/hotel-sentiments';

// Type exports - Location
export * from './lib/types/location/analytics/category-reted-areas';

// Type exports - Ordering
export * from './lib/types/ordering/transfer-orders/index';
export * from './lib/types/ordering/transfer-orders/transfers/cancellation';

// Type exports - Reference Data
export * from './lib/types/reference-data/airlines';
export * from './lib/types/reference-data/locations/airports';
export * from './lib/types/reference-data/locations/cities';
export * from './lib/types/reference-data/locations/hotel';
export * from './lib/types/reference-data/locations/hotels/by-city';
export * from './lib/types/reference-data/locations/hotels/by-geocode';
export * from './lib/types/reference-data/locations/hotels/by-hotels';
export * from './lib/types/reference-data/locations/hotels/index';
export * from './lib/types/reference-data/locations/index';
export * from './lib/types/reference-data/locations/points-of-interest/by-square';
export * from './lib/types/reference-data/locations/points-of-interest/index';
export * from './lib/types/reference-data/locations/points-of-interest/poi';
export * from './lib/types/reference-data/recommended-locations';
export * from './lib/types/reference-data/urls/checkin-links';

// Type exports - Schedule
export * from './lib/types/schedule/flights';

// Type exports - Shopping
export * from './lib/types/shopping/activities/by-square';
export * from './lib/types/shopping/activities/index';
export * from './lib/types/shopping/activity';
export * from './lib/types/shopping/availability/flight-availabilities';
export * from './lib/types/shopping/flight-dates';
export * from './lib/types/shopping/flight-destinations';
export * from './lib/types/shopping/flight-offers-search';
export * from './lib/types/shopping/flight-offers/flight-choice-prediction';
export * from './lib/types/shopping/flight-offers/pricing';
export * from './lib/types/shopping/flight-offers/upselling';
export * from './lib/types/shopping/hotel-offer-search';
export * from './lib/types/shopping/hotel-offers-search';
export * from './lib/types/shopping/seatmaps';
export * from './lib/types/shopping/transfer-offers';

// Type exports - Travel
export * from './lib/types/travel/analytics/air-traffic/booked';
export * from './lib/types/travel/analytics/air-traffic/busiest-period';
export * from './lib/types/travel/analytics/air-traffic/traveled';
export * from './lib/types/travel/predictions/flight-delay';
export * from './lib/types/travel/predictions/trip-purpose';

// Core type exports
export * from './lib/types/errors';
export * from './lib/types/pagination';
export * from './lib/types/shared';
