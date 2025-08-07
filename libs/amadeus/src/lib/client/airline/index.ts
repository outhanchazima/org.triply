import AmadeusClient from '../../services/amadeus-client.service';
import Destinations from './destinations';

/**
 * A namespaced client for the
 * `/v1/airline` endpoints
 *
 * Access via the {@link AmadeusClient} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.airline;
 * ```
 *
 * @param {AmadeusClient} client
 */
class Airline {
  public destinations: Destinations;

  constructor(private readonly client: AmadeusClient) {
    this.destinations = new Destinations(this.client);
  }
}

export default Airline;
