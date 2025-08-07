import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ReferenceDataCheckinLinksParams,
  ReferenceDataCheckinLinksResult,
} from '../../../types/reference-data/urls/checkin-links';

/**
 * A namespaced client for the
 * `/v2/reference-data/urls/checkin-links` endpoints
 *
 * ```ts
 * amadeus.referenceData.urls.checkinLinks;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class CheckinLinks {
  constructor(private client: AmadeusClient) {}

  /**
   * Returns the checkin links for an airline, for the language of your choice.
   * @param {ReferenceDataCheckinLinksParams} params - The parameters for the checkin links search.
   * @returns {Promise<AmadeusResponse<ReferenceDataCheckinLinksResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.urls.checkinLinks.get({
   *   airlineCode: 'AF'
   * });
   */
  public async get(
    params: ReferenceDataCheckinLinksParams
  ): Promise<AmadeusResponse<ReferenceDataCheckinLinksResult>> {
    return this.client.get<ReferenceDataCheckinLinksResult>(
      '/v2/reference-data/urls/checkin-links',
      params
    );
  }
}
