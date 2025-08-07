import AmadeusClient from '../../../../services/amadeus-client.service';
import byCity from './by-city';
import byGeocode from './by-geocode';
import byHotels from './by-hotels';

/**
 * A namespaced client for the `/v1/reference-data/locations/hotels` endpoints
 */
export default class Hotels {
  public byCity: byCity;
  public byGeocode: byGeocode;
  public byHotels: byHotels;

  constructor(private readonly client: AmadeusClient) {
    this.byCity = new byCity(this.client);
    this.byGeocode = new byGeocode(this.client);
    this.byHotels = new byHotels(this.client);
  }
}
