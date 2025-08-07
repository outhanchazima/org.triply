import AmadeusClient, {
  AmadeusResponse,
} from '../../../../services/amadeus-client.service';
import { OrderingTransferCancellationResult } from '../../../../types/ordering/transfer-orders/transfers/cancellation';

/**
 * A namespaced client for the
 * `/v1/ordering/transfer-orders/XXX/transfers/cancellation` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.ordering.transferOrder('XXX').transfers.cancellation.post({}, '12345');
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class Cancellation {
  private readonly orderId: string;

  constructor(private readonly client: AmadeusClient, orderId: string) {
    this.orderId = orderId;
  }

  /**
   * To cancel a transfer order based on its id.
   * @param {object} body - The cancellation request body.
   * @param {string} confirmNbr - The confirmation number.
   * @returns {Promise<AmadeusResponse<OrderingTransferCancellationResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.ordering.transferOrder('XXX').transfers.cancellation.post({}, '12345');
   */
  public async post(
    body: object,
    confirmNbr: string
  ): Promise<AmadeusResponse<OrderingTransferCancellationResult>> {
    return this.client.post<OrderingTransferCancellationResult>(
      `/v1/ordering/transfer-orders/${this.orderId}/transfers/cancellation?confirmNbr=${confirmNbr}`,
      body
    );
  }
}
