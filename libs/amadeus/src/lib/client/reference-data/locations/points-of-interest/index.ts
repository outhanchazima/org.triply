import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsPoisParams,
  ReferenceDataLocationsPoisResult,
} from '../../../../types/reference-data/locations/points-of-interest';
import BySquare from './by-square';

/**
 * A namespaced client for the `/v1/reference-data/locations/pois` endpoints
 */
export default class PointsOfInterest {
  public bySquare: BySquare;

  constructor(private readonly client: AmadeusClient) {
    this.bySquare = new BySquare(client);
  }

  /**
   * Returns a list of relevant points of interest near to a given point.
   * @param {ReferenceDataLocationsPoisParams} params - The parameters for the points of interest search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsPoisResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.pointsOfInterest.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   */
  public async get(
    params: ReferenceDataLocationsPoisParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsPoisResult>> {
    return this.client.get<ReferenceDataLocationsPoisResult>(
      '/v1/reference-data/locations/pois',
      params
    );
  }
}
