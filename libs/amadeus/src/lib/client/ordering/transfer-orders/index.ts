import AmadeusClient, {
  AmadeusResponse,
} from '../../../services/amadeus-client.service';
import {
  OrderingTransferOrdersParams,
  OrderingTransferOrdersResult,
} from '../../../types/ordering/transfer-orders';

/**
 * A namespaced client for the
 * `/v1/ordering/transfer-orders` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.ordering.transferOrders;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class TransferOrders {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To book the selected transfer-offer and create a transfer-order.
   * @param {OrderingTransferOrdersParams} body - The transfer order parameters.
   * @param {string} offerId - The offer ID.
   * @returns {Promise<AmadeusResponse<OrderingTransferOrdersResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.ordering.transferOrders.post(body, '2094123123');
   */
  public async post(
    body: OrderingTransferOrdersParams,
    offerId: string
  ): Promise<AmadeusResponse<OrderingTransferOrdersResult>> {
    return this.client.post<OrderingTransferOrdersResult>(
      `/v1/ordering/transfer-orders?offerId=${offerId}`,
      body
    );
  }
}
