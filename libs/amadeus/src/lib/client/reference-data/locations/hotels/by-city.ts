import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import { ReferenceDataLocationsHotelsByCityParams } from '../../../../types/reference-data/locations/hotels';
import { ReferenceDataLocationsHotelsByCityResult } from '../../../../types/reference-data/locations/hotels/by-city';

/**
 * A namespaced client for the `/v1/reference-data/locations/hotels/by-city` endpoints
 */
export default class byCity {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of hotels for a given area.
   * @param {ReferenceDataLocationsHotelsByCityParams} params - The parameters for the hotels by city search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsHotelsByCityResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.hotels.byCity.get({
   *   cityCode: 'BCN'
   * });
   */
  public async get(
    params: ReferenceDataLocationsHotelsByCityParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsHotelsByCityResult>> {
    return this.client.get<ReferenceDataLocationsHotelsByCityResult>(
      '/v1/reference-data/locations/hotels/by-city',
      params
    );
  }
}
