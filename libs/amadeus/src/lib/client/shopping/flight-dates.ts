import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  FlightDatesParams,
  FlightDatesResult,
} from '../../types/shopping/flight-dates';

/**
 * A namespaced client for the `/v1/shopping/flight-dates` endpoints
 */
export default class FlightDates {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Find the cheapest flight dates from an origin to a destination.
   * @param {FlightDatesParams} params - The parameters for the flight dates search.
   * @returns {Promise<AmadeusResponse<FlightDatesResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.flightDates.get({
   *   origin: 'NYC',
   *   destination: 'MAD'
   * });
   */
  public async get(
    params: FlightDatesParams
  ): Promise<AmadeusResponse<FlightDatesResult>> {
    return this.client.get<FlightDatesResult>(
      '/v1/shopping/flight-dates',
      params
    );
  }
}
