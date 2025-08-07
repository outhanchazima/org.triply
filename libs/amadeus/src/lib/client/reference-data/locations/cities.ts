import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsCitiesParams,
  ReferenceDataLocationsCitiesResult,
} from '../../../types/reference-data/locations/cities';

/**
 * A namespaced client for the `/v2/reference-data/locations/cities` endpoints
 */
export default class Cities {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Return a list of cities matching a given keyword.
   * @param {ReferenceDataLocationsCitiesParams} params - The parameters for the cities search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsCitiesResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.cities.get({
   *   keyword: 'FRANCE'
   * });
   */
  public async get(
    params: ReferenceDataLocationsCitiesParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsCitiesResult>> {
    return this.client.get<ReferenceDataLocationsCitiesResult>(
      '/v1/reference-data/locations/cities',
      params
    );
  }
}
