import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsAirportsParams,
  ReferenceDataLocationsAirportsResult,
} from '../../../types/reference-data/locations/airports';

/**
 * A namespaced client for the `/v2/reference-data/locations/airports` endpoints
 */
export default class Airports {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of relevant airports near to a given point.
   * @param {ReferenceDataLocationsAirportsParams} params - The parameters for the airports search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsAirportsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.airports.get({
   *   longitude: 49.0000,
   *   latitude: 2.55
   * });
   */
  public async get(
    params: ReferenceDataLocationsAirportsParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsAirportsResult>> {
    return this.client.get<ReferenceDataLocationsAirportsResult>(
      '/v1/reference-data/locations/airports',
      params
    );
  }
}
