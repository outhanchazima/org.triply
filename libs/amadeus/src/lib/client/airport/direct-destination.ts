import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  AirportDirectDestinationParams,
  AirportDirectDestinationResult,
} from '../../types/airport/direct-destination';

/**
 * A namespaced client for the
 * `/v1/airport/direct-destinations` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.airport.directDestinations;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class DirectDestinations {
  private readonly client: AmadeusClient;
  constructor(client: AmadeusClient) {
    this.client = client;
  }

  /**
   * Get the percentage of on-time flight departures from a given airport.
   * @param {AirportDirectDestinationParams} params - The parameters for the direct destinations search.
   * @returns {Promise<AmadeusResponse<AirportDirectDestinationResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.airport.directDestinations.get({
   *   departureAirportCode: 'JFK',
   * });
   */
  public async get(
    params: AirportDirectDestinationParams
  ): Promise<AmadeusResponse<AirportDirectDestinationResult>> {
    return this.client.get<AirportDirectDestinationResult>(
      '/v1/airport/direct-destinations',
      params
    );
  }
}
