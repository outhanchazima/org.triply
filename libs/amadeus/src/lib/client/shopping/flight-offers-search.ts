import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  FlightOffersSearchGetParams,
  FlightOffersSearchGetResult,
  FlightOffersSearchPostParams,
  FlightOffersSearchPostResult,
} from '../../types/shopping/flight-offers-search';

/**
 * A namespaced client for the `/v2/shopping/flight-offers` endpoints
 */
export default class FlightOffersSearch {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Get cheapest flight recommendations and prices on a given journey.
   * @param {FlightOffersSearchGetParams} params - The parameters for the flight offers search.
   * @returns {Promise<AmadeusResponse<FlightOffersSearchGetResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.flightOffersSearch.get({
   *   origin: 'NYC',
   *   destination: 'LAX',
   *   departureDate: '2023-01-01',
   *   adults: 1,
   * });
   */
  public async get(
    params: FlightOffersSearchGetParams
  ): Promise<AmadeusResponse<FlightOffersSearchGetResult>> {
    return this.client.get<FlightOffersSearchGetResult>(
      '/v2/shopping/flight-offers',
      params
    );
  }

  /**
   * To do a customized search with every option available.
   * @param {FlightOffersSearchPostParams} params - The parameters for the flight offers search.
   * @returns {Promise<AmadeusResponse<FlightOffersSearchPostResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * 
   *  *
   * To do a customized search with given options.
   *
   * ```ts
   * amadeus.shopping.flightOffersSearch.post({
        "currencyCode": "USD",
        "originDestinations": [
          {
            "id": "1",
            "originLocationCode": "RIO",
            "destinationLocationCode": "MAD",
            "departureDateTimeRange": {
              "date": "2020-03-01",
              "time": "10:00:00"
            }
          },
          {
            "id": "2",
            "originLocationCode": "MAD",
            "destinationLocationCode": "RIO",
            "departureDateTimeRange": {
              "date": "2020-03-05",
              "time": "17:00:00"
            }
          }
        ],
        "travelers": [
          {
            "id": "1",
            "travelerType": "ADULT",
            "fareOptions": [
              "STANDARD"
            ]
          },
          {
            "id": "2",
            "travelerType": "CHILD",
            "fareOptions": [
              "STANDARD"
            ]
          }
        ],
        "sources": [
          "GDS"
        ],
        "searchCriteria": {
          "maxFlightOffers": 50,
          "flightFilters": {
            "cabinRestrictions": [
              {
                "cabin": "BUSINESS",
                "coverage": "MOST_SEGMENTS",
                "originDestinationIds": [
                  "1"
                ]
              }
            ],
            "carrierRestrictions": {
              "excludedCarrierCodes": [
                "AA",
                "TP",
                "AZ"
              ]
            }
          }
        }
      });
    * ```
   */
  public async post(
    params: FlightOffersSearchPostParams
  ): Promise<AmadeusResponse<FlightOffersSearchPostResult>> {
    return this.client.post<FlightOffersSearchPostResult>(
      '/v2/shopping/flight-offers',
      params
    );
  }
}
