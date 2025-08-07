import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  FlightOffersPredictionParams,
  FlightOffersPredictionResult,
} from '../../../types/shopping/flight-offers/flight-choice-prediction';

/**
 * A namespaced client for the `/v1/shopping/flight-offers/prediction` endpoints
 */
export default class FlightChoicePrediction {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Returns a list of flight offers with the probability to be chosen.
   * @param {FlightOffersPredictionParams} params - The parameters for the flight choice prediction.
   * @returns {Promise<AmadeusResponse<FlightOffersPredictionResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const searchResponse = await amadeus.shopping.flightOffersSearch.get({
   *   originLocationCode: 'SYD',
   *   destinationLocationCode: 'BKK',
   *   departureDate: '2020-08-01',
   *   adults: '2'
   * });
   * const response = await amadeus.shopping.flightOffers.prediction.post(searchResponse);
   */
  public async post(
    params: FlightOffersPredictionParams
  ): Promise<AmadeusResponse<FlightOffersPredictionResult>> {
    return this.client.post<FlightOffersPredictionResult>(
      '/v2/shopping/flight-offers/prediction',
      params
    );
  }
}
