import AmadeusClient from '../../services/amadeus-client.service';
import DirectDestinations from './direct-destination';
import Predictions from './predictions';

/**
 * A namespaced client for the
 * `/v1/airport` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.airport;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {DirectDestinations} directDestinations
 * @property {Predictions} predictions
 */
export default class Airport {
  public directDestinations: DirectDestinations;
  public predictions: Predictions;

  constructor(private readonly client: AmadeusClient) {
    this.directDestinations = new DirectDestinations(this.client);
    this.predictions = new Predictions(this.client);
  }
}
