import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ActivitiesParams,
  ActivitiesResult,
} from '../../../types/shopping/activities';
import BySquare from './by-square';

/**
 * A namespaced client for the `/v1/shopping/activities` endpoints
 */
export default class Activities {
  public bySquare: BySquare;

  constructor(private readonly client: AmadeusClient) {
    this.bySquare = new BySquare(this.client);
  }

  /**
   * Get activities for the given location and radius.
   * @param {ActivitiesParams} params - The parameters for the activities search.
   * @returns {Promise<AmadeusResponse<ActivitiesResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.activities.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   */
  public async get(
    params: ActivitiesParams
  ): Promise<AmadeusResponse<ActivitiesResult>> {
    return this.client.get<ActivitiesResult>('/v1/shopping/activities', params);
  }
}
