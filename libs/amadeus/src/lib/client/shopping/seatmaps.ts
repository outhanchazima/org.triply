import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  SeatmapsGetParams,
  SeatmapsGetResult,
  SeatmapsPostParams,
  SeatmapsPostResult,
} from '../../types/shopping/seatmaps';

/**
 * A namespaced client for the `/v1/shopping/seatmaps` endpoints
 */
export default class Seatmaps {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To retrieve the seat map of each flight present in an order.
   * @param {SeatmapsGetParams} params - The parameters for the seatmaps search.
   * @returns {Promise<AmadeusResponse<SeatmapsGetResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.seatmaps.get({
   *   'flight-orderId': 'XXX'
   * });
   */
  public async get(
    params: SeatmapsGetParams
  ): Promise<AmadeusResponse<SeatmapsGetResult>> {
    return this.client.get<SeatmapsGetResult>('/v1/shopping/seatmaps', params);
  }

  /**
   * To retrieve the seat map of each flight included in a flight offer.
   * @param {SeatmapsPostParams} params - The parameters for the seatmaps search.
   * @returns {Promise<AmadeusResponse<SeatmapsPostResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const flightOffersResponse = await amadeus.shopping.flightOffers.get({
   *   originLocationCode: 'MAD',
   *   destinationLocationCode: 'NYC',
   *   departureDate: '2020-08-01',
   *   adults: 1,
   * });
   * const seatmapsResponse = await amadeus.shopping.seatmaps.post({
   *   data: flightOffersResponse.data
   * });
   */
  public async post(
    params: SeatmapsPostParams
  ): Promise<AmadeusResponse<SeatmapsPostResult>> {
    return this.client.post<SeatmapsPostResult>(
      '/v1/shopping/seatmaps',
      params
    );
  }
}
