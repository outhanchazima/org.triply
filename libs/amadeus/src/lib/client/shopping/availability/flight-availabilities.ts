import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  FlightAvailabilitiesParams,
  FlightAvailabilitiesResult,
} from '../../../types/shopping/availability/flight-availabilities';

/**
 * A namespaced client for the `/v1/shopping/availability/flight-availabilities` endpoints
 */
export default class FlightAvailabilities {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Get available seats in different fare classes
   * @param {FlightAvailabilitiesParams} params - The parameters for the flight availabilities search.
   * @returns {Promise<AmadeusResponse<FlightAvailabilitiesResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.availability.flightAvailabilities.post(body);
   */
  public async post(
    params: FlightAvailabilitiesParams
  ): Promise<AmadeusResponse<FlightAvailabilitiesResult>> {
    return this.client.post<FlightAvailabilitiesResult>(
      '/v1/shopping/availability/flight-availabilities',
      params
    );
  }
}
