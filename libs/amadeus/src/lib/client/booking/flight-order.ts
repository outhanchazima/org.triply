import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import { FlightOrderGetResult } from '../../types/booking/flight-order';

/**
 * A namespaced client for the `/v1/booking/flight-orders` endpoints
 */
export default class FlightOrder {
  private orderId: string;

  constructor(private readonly client: AmadeusClient, orderId: string) {
    this.orderId = orderId;
  }

  /**
   * To retrieve a flight order based on its id.
   * @returns {Promise<AmadeusResponse<FlightOrderGetResult>>}
   * @throws {Error} If the request fails or if the order ID is missing.
   * @example
   * const response = await amadeus.booking.flightOrder('XXX').get();
   */
  public async get(): Promise<AmadeusResponse<FlightOrderGetResult>> {
    if (!this.orderId) throw new Error('MISSING_REQUIRED_PARAMETER');

    return this.client.get<FlightOrderGetResult>(
      '/v1/booking/flight-orders/' + this.orderId
    );
  }

  /**
   * To cancel a flight order based on its id.
   * @returns {Promise<AmadeusResponse<null>>}
   * @throws {Error} If the request fails or if the order ID is missing.
   * @example
   * const response = await amadeus.booking.flightOrder('XXX').delete();
   */
  public async delete(): Promise<AmadeusResponse<null>> {
    if (!this.orderId) throw new Error('MISSING_REQUIRED_PARAMETER');

    return this.client.delete<null>(
      '/v1/booking/flight-orders/' + this.orderId
    );
  }
}
