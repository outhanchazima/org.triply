import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  HotelOffersSearchParams,
  HotelOffersSearchResult,
} from '../../types/shopping/hotel-offers-search';

/**
 * A namespaced client for the `/v3/shopping/hotel-offers` endpoints
 */
export default class HotelOffersSearch {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Find the list of available offers in the specific hotels
   * @param {HotelOffersSearchParams} params - The parameters for the hotel offers search.
   * @returns {Promise<AmadeusResponse<HotelOffersSearchResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.hotelOffersSearch.get({
   *   hotelIds: 'RTPAR001',
   *   adults: '2'
   * });
   */
  public async get(
    params: HotelOffersSearchParams
  ): Promise<AmadeusResponse<HotelOffersSearchResult>> {
    return this.client.get<HotelOffersSearchResult>(
      '/v3/shopping/hotel-offers',
      params
    );
  }
}
