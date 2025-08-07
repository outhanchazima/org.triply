import AmadeusClient from '../../../services/amadeus-client.service';
import OnTime from './on-time';

/**
 * A namespaced client for the
 * `/v1/airport/predictions` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.airport.predictions;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {OnTime} onTime
 */
export default class Predictions {
  public onTime: OnTime;

  constructor(private readonly client: AmadeusClient) {
    this.onTime = new OnTime(this.client);
  }
}
