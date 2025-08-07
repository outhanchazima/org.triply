import AmadeusClient from '../../services/amadeus-client.service';
import ItineraryPriceMetrics from './itinerary-price-metrics';

/**
 * A namespaced client for the `/v1/analytics` endpoints
 */
export default class Analytics {
  public itineraryPriceMetrics: ItineraryPriceMetrics;

  constructor(private readonly client: AmadeusClient) {
    this.itineraryPriceMetrics = new ItineraryPriceMetrics(this.client);
  }
}
