import AmadeusClient from '../../services/amadeus-client.service';
import Analytics from './analytics';
import Predictions from './predictions';

/**
 * A namespaced client for the
 * `/v1/travel` & `/v2/travel` & `/v3/travel` endpoints
 * This client provides access to various travel-related APIs, including analytics and predictions.
 *
 * @param {AmadeusClient} client
 * @property {Analytics} analytics
 * @property {Predictions} predictions
 */
export default class Travel {
  public analytics: Analytics;
  public predictions: Predictions;

  constructor(private readonly client: AmadeusClient) {
    this.analytics = new Analytics(this.client);
    this.predictions = new Predictions(this.client);
  }
}
