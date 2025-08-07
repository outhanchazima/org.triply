import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  ReferenceDataLocationsParams,
  ReferenceDataLocationsResult,
} from '../../../types/reference-data/locations';
import Airports from './airports';
import Cities from './cities';
import Hotel from './hotel';
import Hotels from './hotels';
import PointsOfInterest from './points-of-interest';
import PointOfInterest from './points-of-interest/poi';

/**
 * A namespaced client for the `/v2/reference-data/locations` endpoints
 */
export default class Locations {
  public airports: Airports;
  public cities: Cities;
  public hotel: Hotel;
  public hotels: Hotels;
  public pointsOfInterest: PointsOfInterest;

  constructor(private readonly client: AmadeusClient) {
    this.airports = new Airports(this.client);
    this.cities = new Cities(this.client);
    this.hotel = new Hotel(this.client);
    this.hotels = new Hotels(this.client);
    this.pointsOfInterest = new PointsOfInterest(this.client);
  }

  /**
   * Returns a list of airports and cities matching a given keyword.
   * @param {ReferenceDataLocationsParams} params - The parameters for the locations search.
   * @returns {Promise<AmadeusResponse<ReferenceDataLocationsResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.referenceData.locations.get({
   *   keyword: 'lon',
   *   subType: Amadeus.location.any
   * });
   */
  public async get(
    params: ReferenceDataLocationsParams
  ): Promise<AmadeusResponse<ReferenceDataLocationsResult>> {
    return this.client.get<ReferenceDataLocationsResult>(
      '/v1/reference-data/locations',
      params
    );
  }

  public pointOfInterest(poiId: string) {
    return new PointOfInterest(this.client, poiId);
  }
}
