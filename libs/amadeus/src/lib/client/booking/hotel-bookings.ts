import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import { HotelBookingParams } from '../../types/booking/hotel-bookings';

/**
 * A namespaced client for the `/v1/booking/hotel-bookings` endpoints
 */
export default class HotelBookings {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To book the offer retrieved from Hotel Shopping API.
   * @param {HotelBookingParams} params - The parameters for the hotel booking.
   * @returns {Promise<AmadeusResponse<any>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.booking.hotelBookings.post({
   *   data: {
   *     offerId: 'XXXX',
   *     guests: [],
   *     payments: [],
   *     rooms: []
   *   }
   * });
   */
  public async post(params: HotelBookingParams): Promise<AmadeusResponse<any>> {
    return this.client.post<any>('/v1/booking/hotel-bookings', params);
  }
}
