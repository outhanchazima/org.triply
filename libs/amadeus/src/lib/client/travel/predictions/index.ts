import AmadeusClient from '../../../services/amadeus-client.service';
import FlightDelay from './flight-delay';
import TripPurpose from './trip-purpose';

/**
 * A namespaced client for the
 * `/v1/travel/predictions` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.travel.predictions;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {TripPurpose} tripPurpose
 * @property {FlightDelay} flightDelay
 */
export default class Predictions {
  public tripPurpose: TripPurpose;
  public flightDelay: FlightDelay;

  constructor(private readonly client: AmadeusClient) {
    this.tripPurpose = new TripPurpose(this.client);
    this.flightDelay = new FlightDelay(this.client);
  }
}
