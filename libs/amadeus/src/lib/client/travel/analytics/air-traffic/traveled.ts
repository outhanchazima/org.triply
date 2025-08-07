import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  TravelAnalayticsAirTrafficTraveledParams,
  TravelAnalayticsAirTrafficTraveledResult,
} from '../../../../types/travel/analytics/air-traffic/traveled';

/**
 * A namespaced client for the `/v1/travel/analytics/air-traffic/traveled` endpoints
 */
export default class Traveled {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of air traffic reports based on the number of people traveling.
   * @param {TravelAnalayticsAirTrafficTraveledParams} params - The parameters for the air traffic traveled search.
   * @returns {Promise<AmadeusResponse<TravelAnalayticsAirTrafficTraveledResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.travel.analytics.airTraffic.traveled.get({
   *   originCityCode: 'MAD',
   *   period: '2017-01'
   * });
   */
  public async get(
    params: TravelAnalayticsAirTrafficTraveledParams
  ): Promise<AmadeusResponse<TravelAnalayticsAirTrafficTraveledResult>> {
    return this.client.get<TravelAnalayticsAirTrafficTraveledResult>(
      '/v1/travel/analytics/air-traffic/traveled',
      params
    );
  }
}
