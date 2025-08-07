import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  HotelOrdersParams,
  HotelOrdersResult,
} from '../../types/booking/hotel-orders';

/**
 * A namespaced client for the `/v2/booking/hotel-orders` endpoints
 */
export default class HotelOrders {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To book the offer retrieved from Hotel Search API.
   * @param {HotelOrdersParams} params - The parameters for the hotel order.
   * @returns {Promise<AmadeusResponse<HotelOrdersResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.booking.hotelOrders.post({
   *   data: {
   *     type: 'hotel-order',
   *     guests: [],
   *     travelAgent: {},
   *     roomAssociations: [],
   *     payment: {}
   *   }
   * });
   */
  public async post(
    params: HotelOrdersParams
  ): Promise<AmadeusResponse<HotelOrdersResult>> {
    return this.client.post<HotelOrdersResult>(
      '/v2/booking/hotel-orders',
      params
    );
  }
}
