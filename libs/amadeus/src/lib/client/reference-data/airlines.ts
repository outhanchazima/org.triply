import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  ReferenceDataAirlinesParams,
  ReferenceDataAirlinesResult,
} from '../../types/reference-data/airlines';

/**
 * A namespaced client for the
 * `/v1/reference-data/airlines` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.referenceData.airlines;
 * ```
 */
export default class Airlines {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns the airline name and code.
   *
   * @param params - Query parameters
   * @param params.airlineCodes - Code of the airline following IATA or ICAO standard
   * @returns Promise resolving to airline details
   * @throws {Error} When the request fails
   * @example
   * ```ts
   * const amadeus = new Amadeus();
   * const result = await amadeus.referenceData.airlines.get({
   *   airlineCodes: 'BA'
   * });
   * console.log(result.data);
   * ```
   */
  public async get(
    params: ReferenceDataAirlinesParams
  ): Promise<AmadeusResponse<ReferenceDataAirlinesResult>> {
    return this.client.get<ReferenceDataAirlinesResult>(
      '/v1/reference-data/airlines',
      params
    );
  }
}
