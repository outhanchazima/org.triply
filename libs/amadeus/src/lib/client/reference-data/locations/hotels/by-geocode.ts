import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import { ReferenceDataLocationsHotelsByGeoCodeParams } from '../../../../types/reference-data/locations/hotels';
import { ReferenceDataLocationsHotelsByGeoCodeResult } from '../../../../types/reference-data/locations/hotels/by-geocode';

/**
 * A namespaced client for the `/v1/reference-data/locations/hotels/by-geocode` endpoints
 */
export default class byGeocode {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of hotels for a given area.
   * @param {ReferenceDataLocationsHotelsByGeoCodeParams} params - The parameters for the hotels by geocode search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsHotelsByGeoCodeResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.hotels.byGeocode.get({
   *   latitude: 48.83152,
   *   longitude: 2.24691
   * });
   */
  public async get(
    params: ReferenceDataLocationsHotelsByGeoCodeParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsHotelsByGeoCodeResult>> {
    return this.client.get<ReferenceDataLocationsHotelsByGeoCodeResult>(
      '/v1/reference-data/locations/hotels/by-geocode',
      params
    );
  }
}
