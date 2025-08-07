import AmadeusClient from '../../../services/amadeus-client.service';
import FlightAvailabilities from './flight-availabilities';

/**
 * A namespaced client for the `/v1/shopping/availability` endpoints
 */
export default class Availability {
  public flightAvailabilities: FlightAvailabilities;

  constructor(private readonly client: AmadeusClient) {
    this.flightAvailabilities = new FlightAvailabilities(this.client);
  }
}
