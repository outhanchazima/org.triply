import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsPoisBySquareParams,
  ReferenceDataLocationsPoisBySquareResult,
} from '../../../../types/reference-data/locations/points-of-interest/by-square';

/**
 * A namespaced client for the `/v1/reference-data/locations/pois/by-square` endpoints
 */
export default class BySquare {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of relevant points of interest for a given area.
   * @param {ReferenceDataLocationsPoisBySquareParams} params - The parameters for the points of interest by square search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsPoisBySquareResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.pointsOfInterest.bySquare.get({
   *   north: 41.397158,
   *   west: 2.160873,
   *   south: 41.394582,
   *   east: 2.177181
   * });
   */
  public async get(
    params: ReferenceDataLocationsPoisBySquareParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsPoisBySquareResult>> {
    return this.client.get<ReferenceDataLocationsPoisBySquareResult>(
      '/v1/reference-data/locations/pois/by-square',
      params
    );
  }
}
