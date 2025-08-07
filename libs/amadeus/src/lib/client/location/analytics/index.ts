import AmadeusClient from '../../../services/amadeus-client.service';
import CategoryRatedAreas from './category-rated-areas';

/**
 * A namespaced client for the `/v1/location/analytics` endpoints
 */
export default class Analytics {
  public categoryRatedAreas: CategoryRatedAreas;

  constructor(private readonly client: AmadeusClient) {
    this.categoryRatedAreas = new CategoryRatedAreas(this.client);
  }
}
