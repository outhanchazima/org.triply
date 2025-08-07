import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  ItineraryPriceMetricsParams,
  ItineraryPriceMetricsResult,
} from '../../types/analytics/itinerary-price-metrics';

/**
 * A namespaced client for the `/v1/analytics/itinerary-price-metrics` endpoints
 */
export default class ItineraryPriceMetrics {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Provides historical prices in a quartile distribution, including minimum, maximum and average price.
   * @param {ItineraryPriceMetricsParams} params - The parameters for the itinerary price metrics search.
   * @returns {Promise<AmadeusResponse<ItineraryPriceMetricsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.analytics.itineraryPriceMetrics.get({
   *   originIataCode: 'MAD',
   *   destinationIataCode: 'CDG',
   *   departureDate: '2021-03-13'
   * });
   */
  public async get(
    params: ItineraryPriceMetricsParams
  ): Promise<AmadeusResponse<ItineraryPriceMetricsResult>> {
    return this.client.get<ItineraryPriceMetricsResult>(
      '/v1/analytics/itinerary-price-metrics',
      params
    );
  }
}
