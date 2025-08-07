import AmadeusClient from '../../services/amadeus-client.service';
import FlightOrder from './flight-order';
import FlightOrders from './flight-orders';
import HotelBookings from './hotel-bookings';
import HotelOrders from './hotel-orders';

/**
 * A namespaced client for the `/v1/booking` endpoints
 */
export default class Booking {
  public flightOrders: FlightOrders;
  public hotelBookings: HotelBookings;
  public hotelOrders: HotelOrders;

  constructor(private readonly client: AmadeusClient) {
    this.flightOrders = new FlightOrders(this.client);
    this.hotelBookings = new HotelBookings(this.client);
    this.hotelOrders = new HotelOrders(this.client);
  }

  flightOrder(orderId: string) {
    return new FlightOrder(this.client, orderId);
  }
}
