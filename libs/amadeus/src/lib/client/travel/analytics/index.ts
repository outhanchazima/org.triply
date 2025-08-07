import AmadeusClient from '../../../services/amadeus-client.service';
import AirTraffic from './air-traffic';

/**
 * A namespaced client for the
 * `/v2/travel/analytics` endpoints
 *
 * Access via the {Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.travel.analytics;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {Urls} urls
 * @protected
 */
export default class Analytics {
  public airTraffic: AirTraffic;

  constructor(private readonly client: AmadeusClient) {
    this.airTraffic = new AirTraffic(this.client);
  }
}
