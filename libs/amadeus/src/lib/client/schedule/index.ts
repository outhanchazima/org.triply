import AmadeusClient from '../../services/amadeus-client.service';
import Flights from './flights';

/**
 * A namespaced client for the
 * `/v2/schedule` endpoints
 *
 * Access via the {Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.schedule.flights;
 * ```
 */
export default class Schedule {
  public flights: Flights;

  constructor(private readonly client: AmadeusClient) {
    this.flights = new Flights(this.client);
  }
}
