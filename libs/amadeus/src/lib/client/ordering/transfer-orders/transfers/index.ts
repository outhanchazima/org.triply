import AmadeusClient from '../../../../services/amadeus-client.service';
import Cancellation from './cancellation';

/**
 * A namespaced client for the
 * `/v1/ordering/transfer-orders/XXXXX/transfers` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.ordering.transferOrders('XXX').transfers;
 * ```
 *
 * @param {AmadeusClient} client
 */
export default class Transfers {
  private readonly orderId: string;
  public cancellation: Cancellation;

  constructor(private readonly client: AmadeusClient, orderId: string) {
    this.orderId = orderId;
    this.cancellation = new Cancellation(this.client, orderId);
  }
}
