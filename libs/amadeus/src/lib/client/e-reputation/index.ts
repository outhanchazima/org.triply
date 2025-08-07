import AmadeusClient from '../../services/amadeus-client.service';
import HotelSentiments from './hotel-sentiments';

/**
 * A namespaced client for the
 * `/v2/e-reputation` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.eReputation;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {HotelSentiments} hotelSentiments
 */
export default class EReputation {
  public hotelSentiments: HotelSentiments;

  constructor(private readonly client: AmadeusClient) {
    this.hotelSentiments = new HotelSentiments(this.client);
  }
}
