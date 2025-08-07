import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsHotelsByHotelsParams,
  ReferenceDataLocationsHotelsByHotelsResult,
} from '../../../../types/reference-data/locations/hotels/by-hotels';

/**
 * A namespaced client for the `/v1/reference-data/locations/hotels/by-hotels` endpoints
 */
export default class byHotels {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of hotels for a given area.
   * @param {ReferenceDataLocationsHotelsByHotelsParams} params - The parameters for the hotels by hotels search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsHotelsByHotelsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.hotels.byHotels.get({
   *   hotelIds: 'ACPAR245'
   * });
   */
  public async get(
    params: ReferenceDataLocationsHotelsByHotelsParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsHotelsByHotelsResult>> {
    return this.client.get<ReferenceDataLocationsHotelsByHotelsResult>(
      '/v1/reference-data/locations/hotels/by-hotels',
      params
    );
  }
}
