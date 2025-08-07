import AmadeusClient from '../../../services/amadeus-client.service';
import FlightChoicePrediction from './flight-choice-prediction';
import Pricing from './pricing';
import Upselling from './upselling';

/**
 * A namespaced client for the `/v1/shopping/flight-offers` endpoints
 */
export default class FlightOffers {
  public prediction: FlightChoicePrediction;
  public pricing: Pricing;
  public upselling: Upselling;

  constructor(private readonly client: AmadeusClient) {
    this.prediction = new FlightChoicePrediction(this.client);
    this.pricing = new Pricing(this.client);
    this.upselling = new Upselling(this.client);
  }
}
