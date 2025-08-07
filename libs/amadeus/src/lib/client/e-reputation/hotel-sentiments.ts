import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  HotelSentimentsParams,
  HotelSentimentsResult,
} from '../../types/e-reputation/hotel-sentiments';

/**
 * A namespaced client for the
 * `/v2/e-reputation/hotel-sentiments` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.eReputation.hotelSentiments;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class HotelSentiments {
  private readonly client: AmadeusClient;

  constructor(client: AmadeusClient) {
    this.client = client;
  }

  /**
   * Get the sentiment analysis of hotel reviews.
   * @param {HotelSentimentsParams} params - The parameters for the hotel sentiments search.
   * @returns {Promise<AmadeusResponse<HotelSentimentsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.eReputation.hotelSentiments.get({
   *   hotelIds: 'XKPARC12'
   * });
   */
  public async get(
    params: HotelSentimentsParams
  ): Promise<AmadeusResponse<HotelSentimentsResult>> {
    return this.client.get<HotelSentimentsResult>(
      '/v2/e-reputation/hotel-sentiments',
      params
    );
  }
}
