import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ActivitiesBySquareParams,
  ActivitiesBySquareResult,
} from '../../../types/shopping/activities/by-square';

/**
 * A namespaced client for the `/v1/shopping/activities/by-square` endpoints
 */
export default class BySquare {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of tours and activities a given area.
   * @param {ActivitiesBySquareParams} params - The parameters for the activities search.
   * @returns {Promise<AmadeusResponse<ActivitiesBySquareResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.activities.bySquare.get({
   *   north: 41.397158,
   *   west: 2.160873,
   *   south: 41.394582,
   *   east: 2.177181
   * });
   */
  public async get(
    params: ActivitiesBySquareParams
  ): Promise<AmadeusResponse<ActivitiesBySquareResult>> {
    return this.client.get<ActivitiesBySquareResult>(
      '/v1/shopping/activities/by-square',
      params
    );
  }
}
