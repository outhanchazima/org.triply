import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  FlightDestinationsParams,
  FlightDestinationsResult,
} from '../../types/shopping/flight-destinations';

/**
 * A namespaced client for the `/v1/shopping/flight-destinations` endpoints
 */
export default class FlightDestinations {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Find the cheapest destinations where you can fly to.
   * @param {FlightDestinationsParams} params - The parameters for the flight destinations search.
   * @returns {Promise<AmadeusResponse<FlightDestinationsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.flightDestinations.get({
   *   origin: 'MAD'
   * });
   */
  public async get(
    params: FlightDestinationsParams
  ): Promise<AmadeusResponse<FlightDestinationsResult>> {
    return this.client.get<FlightDestinationsResult>(
      '/v1/shopping/flight-destinations',
      params
    );
  }
}
