import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  AirpoerPredictionsOnTimeParams,
  AirpoerPredictionsOnTimeResult,
} from '../../../types/airport/predictions/on-time';

/**
 * A namespaced client for the
 * `/v1/airport/predictions/on-time` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.airport.predictions.onTime;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class OnTime {
  private readonly client: AmadeusClient;
  constructor(client: AmadeusClient) {
    this.client = client;
  }

  /**
   * Get the percentage of on-time flight departures from a given airport.
   * @param {AirpoerPredictionsOnTimeParams} params - The parameters for the on-time prediction.
   * @returns {Promise<AmadeusResponse<AirpoerPredictionsOnTimeResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.airport.predictions.onTime.get({
   *   airportCode: 'JFK',
   *   date: '2020-08-01'
   * });
   */
  public async get(
    params: AirpoerPredictionsOnTimeParams
  ): Promise<AmadeusResponse<AirpoerPredictionsOnTimeResult>> {
    return this.client.get<AirpoerPredictionsOnTimeResult>(
      '/v1/airport/predictions/on-time',
      params
    );
  }
}
