import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  AirlineDestinationsParams,
  AirlineDestinationsResult,
} from '../../types/airline/destinations';

/**
 * A namespaced client for the `/v1/airline/destinations` endpoints
 */
export default class Destinations {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Find all destinations served by a given airline
   * @param {AirlineDestinationsParams} params - The parameters for the airline destinations search.
   * @returns {Promise<AmadeusResponse<AirlineDestinationsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.airline.destinations.get({
   *   airlineCode: 'BA',
   * });
   */
  public async get(
    params: AirlineDestinationsParams
  ): Promise<AmadeusResponse<AirlineDestinationsResult>> {
    return this.client.get<AirlineDestinationsResult>(
      '/v1/airline/destinations',
      params
    );
  }
}
