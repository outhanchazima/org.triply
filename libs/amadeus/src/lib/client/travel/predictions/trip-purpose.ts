import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  TripPurposeParams,
  TripPurposeResult,
} from '../../../types/travel/predictions/trip-purpose';

/**
 * A namespaced client for the `/v1/travel/predictions/trip-purpose` endpoints
 */
export default class TripPurpose {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Forecast traveler purpose, Business or Leisure, together with the probability.
   * @param {TripPurposeParams} params - The parameters for the trip purpose prediction.
   * @returns {Promise<AmadeusResponse<TripPurposeResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.travel.predictions.tripPurpose.get({
   *   originLocationCode: 'NYC',
   *   destinationLocationCode: 'MAD',
   *   departureDate: '2020-08-01',
   *   returnDate: '2020-08-12'
   * });
   */
  public async get(
    params: TripPurposeParams
  ): Promise<AmadeusResponse<TripPurposeResult>> {
    return this.client.get<TripPurposeResult>(
      '/v1/travel/predictions/trip-purpose',
      params
    );
  }
}
