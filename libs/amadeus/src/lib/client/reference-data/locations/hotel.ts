import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsHotelParams,
  ReferenceDataLocationsHotelResult,
} from '../../../types/reference-data/locations/hotel';

/**
 * A namespaced client for the `/v1/reference-data/locations/hotel` endpoints
 */
export default class Hotel {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of hotels for a given area.
   * @param {ReferenceDataLocationsHotelParams} params - The parameters for the hotel search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsHotelResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.hotel.get({
   *   keyword: 'PARIS',
   *   subType: 'HOTEL_GDS'
   * });
   */
  public async get(
    params: ReferenceDataLocationsHotelParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsHotelResult>> {
    return this.client.get<ReferenceDataLocationsHotelResult>(
      '/v1/reference-data/locations/hotel',
      params
    );
  }
}
