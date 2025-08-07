import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import { ReferenceDataLocationsPoisPoiResult } from '../../../../types/reference-data/locations/points-of-interest/poi';

/**
 * A namespaced client for the `/v1/reference-data/locations/pois` endpoints
 */
export default class PointOfInterest {
  constructor(
    private readonly client: AmadeusClient,
    private readonly poiId: string
  ) {}

  /**
   * Extracts the information about point of interest with given ID.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsPoisPoiResult>>}
   * @throws {Error} If the request fails.
   * @example
   * const response = await amadeus.referenceData.locations.pointOfInterest('9CB40CB5D0').get();
   */
  public async get(): Promise<
    AmadeusResponse<ReferenceDataLocationsPoisPoiResult>
  > {
    return this.client.get<ReferenceDataLocationsPoisPoiResult>(
      `/v1/reference-data/locations/pois/${this.poiId}`
    );
  }
}
