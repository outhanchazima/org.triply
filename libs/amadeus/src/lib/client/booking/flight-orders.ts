import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  FlightOrdersParams,
  FlightOrdersResult,
} from '../../types/booking/flight-orders';

/**
 * A namespaced client for the `/v1/booking/flight-orders` endpoints
 */
export default class FlightOrders {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To book the selected flight-offer and create a flight-order
   * @param {FlightOrdersParams} params - The parameters for the flight order creation.
   * @returns {Promise<AmadeusResponse<FlightOrdersResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.booking.flightOrders.post({
   *   type: 'flight-order',
   *   flightOffers: [],
   *   travelers: []
   * });
   */
  public async post(
    params: FlightOrdersParams
  ): Promise<AmadeusResponse<FlightOrdersResult>> {
    return this.client.post<FlightOrdersResult>(
      '/v1/booking/flight-orders',
      params
    );
  }
}
