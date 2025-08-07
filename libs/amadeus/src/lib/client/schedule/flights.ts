import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  ScheduleFlightsParams,
  ScheduleFlightsResult,
} from '../../types/schedule/flights';

/**
 * A namespaced client for the
 * `/v2/schedule/flights` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.schedule.flights;
 * ```
 */
export default class Flights {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Provides real-time flight schedule data including up-to-date departure and arrival times,
   * terminal and gate information, flight duration and real-time delay status
   *
   * @param params - Query parameters
   * @param params.carrierCode - 2 to 3-character IATA carrier code (required)
   * @param params.flightNumber - 1 to 4-digit number of the flight, e.g. 4537 (required)
   * @param params.scheduledDepartureDate - Scheduled departure date of the flight, local to the departure airport (required)
   * @returns Promise resolving to flight schedule details
   * @throws {Error} When the request fails
   * @example
   * ```ts
   * const result = await amadeus.schedule.flights.get({
   *   carrierCode: 'AZ',
   *   flightNumber: '319',
   *   scheduledDepartureDate: '2021-03-13'
   * });
   * ```
   */
  public async get(
    params: ScheduleFlightsParams
  ): Promise<AmadeusResponse<ScheduleFlightsResult>> {
    return this.client.get<ScheduleFlightsResult>(
      '/v2/schedule/flights',
      params
    );
  }
}
