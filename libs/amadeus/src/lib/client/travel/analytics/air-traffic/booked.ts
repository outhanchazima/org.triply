import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import {
  TravelAnalayticsAirTrafficBookedParams,
  TravelAnalayticsAirTrafficBookedResult,
} from '../../../../types/travel/analytics/air-traffic/booked';

/**
 * A namespaced client for the `/v1/travel/analytics/air-traffic/booked` endpoints
 */
export default class Booked {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of air traffic reports based on the number of bookings.
   * @param {TravelAnalayticsAirTrafficBookedParams} params - The parameters for the air traffic booked search.
   * @returns {Promise<AmadeusResponse<TravelAnalayticsAirTrafficBookedResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.travel.analytics.airTraffic.booked.get({
   *   originCityCode: 'MAD',
   *   period: '2017-08'
   * });
   */
  public async get(
    params: TravelAnalayticsAirTrafficBookedParams
  ): Promise<AmadeusResponse<TravelAnalayticsAirTrafficBookedResult>> {
    return this.client.get<TravelAnalayticsAirTrafficBookedResult>(
      '/v1/travel/analytics/air-traffic/booked',
      params
    );
  }
}
