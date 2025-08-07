import AmadeusClient from '../../../services/amadeus-client.service';
import CheckinLinks from './checkin-links';

/**
 * A namespaced client for the
 * `/v2/reference-data/urls` endpoints
 *
 * ```ts
 * amadeus.referenceData.urls;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {CheckinLinks} checkinLinks
 */
export default class Urls {
  public checkinLinks: CheckinLinks;

  constructor(private readonly client: AmadeusClient) {
    this.checkinLinks = new CheckinLinks(this.client);
  }
}
