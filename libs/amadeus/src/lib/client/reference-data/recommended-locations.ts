import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  RecommendedLocationsParams,
  RecommendedLocationsResult,
} from '../../types/reference-data/recommended-locations';

/**
 * A namespaced client for the
 * `/v1/reference-data/recommended-locations` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.referenceData.recommendedLocations;
 * ```
 */
export default class RecommendedLocations {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns the recommended locations (destinations).
   *
   * @param params - Query parameters
   * @param params.cityCodes - Code of the city following IATA standard
   * @param params.travelerCountryCode - Origin country of the traveler following IATA standard
   * @param params.destinationCountryCodes - Country codes follow IATA standard
   * @returns Promise resolving to recommended destinations
   * @throws {Error} When the request fails
   * @example
   * ```ts
   * const result = await amadeus.referenceData.recommendedDestinations.get({
   *   cityCodes: 'PAR',
   *   travelerCountryCode: 'FR'
   * });
   * ```
   */
  public async get(
    params: RecommendedLocationsParams
  ): Promise<AmadeusResponse<RecommendedLocationsResult>> {
    return this.client.get<RecommendedLocationsResult>(
      '/v1/reference-data/recommended-locations',
      params
    );
  }
}
