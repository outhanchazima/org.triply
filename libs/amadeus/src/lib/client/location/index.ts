import AmadeusClient from '../../services/amadeus-client.service';
import Analytics from './analytics';

/**
 * A namespaced client for the `/v1/location` endpoints
 */
export default class Location {
  public analytics: Analytics;

  constructor(private readonly client: AmadeusClient) {
    this.analytics = new Analytics(this.client);
  }
}
