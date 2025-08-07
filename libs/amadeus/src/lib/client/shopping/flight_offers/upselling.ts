import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  FlightOffersUpsellingParams,
  FlightOffersUpsellingResult,
} from '../../../types/shopping/flight-offers/upselling';

/**
 * A namespaced client for the `/v1/shopping/flight-offers/upselling` endpoints
 */
export default class Upselling {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * Get available seats in different fare classes.
   * @param {FlightOffersUpsellingParams} params - The parameters for the flight offers upselling.
   * @returns {Promise<AmadeusResponse<FlightOffersUpsellingResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.flightOffers.upselling.post(body);
   */
  public async post(
    params: FlightOffersUpsellingParams
  ): Promise<AmadeusResponse<FlightOffersUpsellingResult>> {
    return this.client.post<FlightOffersUpsellingResult>(
      '/v1/shopping/flight-offers/upselling',
      params
    );
  }
}
