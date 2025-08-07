import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  TravelAnalayticsAirTrafficBusiestPeriodParams,
  TravelAnalayticsAirTrafficBusiestPeriodResult,
} from '../../../../types/travel/analytics/air-traffic/busiest-period';

/**
 * A namespaced client for the `/v1/travel/analytics/air-traffic/busiest-period` endpoints
 */
export default class BusiestPeriod {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of air traffic reports.
   * @param {TravelAnalayticsAirTrafficBusiestPeriodParams} params - The parameters for the busiest period search.
   * @returns {Promise<AmadeusResponse<TravelAnalayticsAirTrafficBusiestPeriodResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.travel.analytics.airTraffic.busiestPeriod.get({
   *   cityCode: 'MAD',
   *   period: '2017',
   *   direction: 'arriving'
   * });
   */
  public async get(
    params: TravelAnalayticsAirTrafficBusiestPeriodParams
  ): Promise<AmadeusResponse<TravelAnalayticsAirTrafficBusiestPeriodResult>> {
    return this.client.get<TravelAnalayticsAirTrafficBusiestPeriodResult>(
      '/v1/travel/analytics/air-traffic/busiest-period',
      params
    );
  }
}
