import AmadeusClient from '../../../../services/amadeus-client.service';
import Booked from './booked';
import BusiestPeriod from './busiest-period';
import Traveled from './traveled';

/**
 * A namespaced client for the `/v1/travel/analytics/air-traffic` endpoints
 */
export default class AirTraffic {
  public traveled: Traveled;
  public booked: Booked;
  public busiestPeriod: BusiestPeriod;

  constructor(private readonly client: AmadeusClient) {
    this.traveled = new Traveled(this.client);
    this.booked = new Booked(this.client);
    this.busiestPeriod = new BusiestPeriod(this.client);
  }
}
