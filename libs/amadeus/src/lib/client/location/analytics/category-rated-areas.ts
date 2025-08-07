import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  CategoryRatedAreaParams,
  CategoryRatedAreaResult,
} from '../../../types/location/analytics/category-reted-areas';

/**
 * A namespaced client for the `/v1/location/analytics/category-rated-areas` endpoints
 */
export default class CategoryRatedAreas {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Gets popularity score for location categories.
   * @param {CategoryRatedAreaParams} params - The parameters for the category rated areas search.
   * @returns {Promise<AmadeusResponse<CategoryRatedAreaResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.location.analytics.categoryRatedAreas.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   */
  public async get(
    params: CategoryRatedAreaParams
  ): Promise<AmadeusResponse<CategoryRatedAreaResult>> {
    return this.client.get<CategoryRatedAreaResult>(
      '/v1/location/analytics/category-rated-areas',
      params
    );
  }
}
