import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  FlightDelayPredictionParams,
  FlightDelayPredictionResult,
} from '../../../types/travel/predictions/flight-delay';

/**
 * A namespaced client for the `/v1/travel/predictions/flight-delay` endpoints
 */
export default class FlightDelay {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * This machine learning API predicts flight delays based on flight details.
   * @param {FlightDelayPredictionParams} params - The parameters for the flight delay prediction.
   * @returns {Promise<AmadeusResponse<FlightDelayPredictionResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.travel.predictions.flightDelay.get({
   *   originLocationCode: 'BRU',
   *   destinationLocationCode: 'FRA',
   *   departureDate: '2020-01-14',
   *   departureTime: '11:05:00',
   *   arrivalDate: '2020-01-14',
   *   arrivalTime: '12:10:00',
   *   aircraftCode: '32A',
   *   carrierCode: 'LH',
   *   flightNumber: '1009',
   *   duration: 'PT1H05M'
   * });
   */
  public async get(
    params: FlightDelayPredictionParams
  ): Promise<AmadeusResponse<FlightDelayPredictionResult>> {
    return this.client.get<FlightDelayPredictionResult>(
      '/v1/travel/predictions/flight-delay',
      params
    );
  }
}
