import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  FlightOffersPricingAdditionalParams,
  FlightOffersPricingParams,
  FlightOffersPricingResult,
} from '../../../types/shopping/flight-offers/pricing';

/**
 * A namespaced client for the `/v1/shopping/flight-offers/pricing` endpoints
 */
export default class Pricing {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To get or confirm the price of a flight and obtain information about taxes and fees to be applied to the entire journey.
   * @param {FlightOffersPricingParams} params - The flight offers pricing parameters.
   * @param {FlightOffersPricingAdditionalParams} additionalParams - Additional query parameters.
   * @returns {Promise<AmadeusResponse<FlightOffersPricingResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.flightOffers.pricing.post({
   *   data: {
   *     type: 'flight-offers-pricing',
   *     flightOffers: []
   *   }
   * });
   */
  public async post(
    params: FlightOffersPricingParams,
    additionalParams: FlightOffersPricingAdditionalParams = {}
  ): Promise<AmadeusResponse<FlightOffersPricingResult>> {
    // Convert additionalParams object to query string
    const queryString = Object.keys(additionalParams)
      .map(
        (key) =>
          key +
          '=' +
          additionalParams[key as keyof FlightOffersPricingAdditionalParams]
      )
      .join('&');

    // Check if queryString is empty before appending it to the URL
    let url = '/v1/shopping/flight-offers/pricing';
    if (queryString !== '') {
      url += '?' + queryString;
    }

    return this.client.post<FlightOffersPricingResult>(url, params);
  }
}
