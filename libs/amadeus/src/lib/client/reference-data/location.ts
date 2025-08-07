import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import { ReferenceDataLocationsResult } from '../../types/reference-data/locations/index';

/**
 * A namespaced client for the
 * `/v1/reference-data/locations/:location_id` endpoints
 *
 * Access via the {@link AmadeusClient} object
 *
 * ```ts
 * const amadeus = new AmadeusClient();
 * amadeus.referenceData.location('ALHR');
 * ```
 */
export default class Location {
  constructor(
    private readonly client: AmadeusClient,
    private readonly locationId: string
  ) {}

  /**
   * Returns details for a specific airport
   *
   * @param params - Optional query parameters
   * @returns Promise resolving to location details
   * @throws {Error} When the request fails
   * @example
   * ```ts
   * const result = await amadeus.referenceData.location('ALHR').get();
   * ```
   */
  public async get(
    params: object = {}
  ): Promise<AmadeusResponse<ReferenceDataLocationsResult>> {
    return this.client.get<ReferenceDataLocationsResult>(
      `/v1/reference-data/locations/${this.locationId}`,
      params
    );
  }
}
