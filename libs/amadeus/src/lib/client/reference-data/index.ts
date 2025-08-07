import AmadeusClient from '../../services/amadeus-client.service';
import Airlines from './airlines';
import Location from './location';
import Locations from './locations';
import RecommendedLocations from './recommended-locations';
import Urls from './urls';

/**
 * A namespaced client for the `/v2/reference-data` endpoints
 */
export default class ReferenceData {
  public urls: Urls;
  public locations: Locations;
  public airlines: Airlines;
  public recommendedLocations: RecommendedLocations;

  constructor(private readonly client: AmadeusClient) {
    this.urls = new Urls(this.client);
    this.locations = new Locations(this.client);
    this.airlines = new Airlines(this.client);
    this.recommendedLocations = new RecommendedLocations(this.client);
  }

  /**
   * The namespace for the Location APIs - accessing a specific location
   * @param {string} locationId - The ID of the location to search for
   * @return {Location}
   */
  public location(locationId: string): Location {
    return new Location(this.client, locationId);
  }
}
