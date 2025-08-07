import AmadeusClient from '../../services/amadeus-client.service';
import TransferOrder from './transfer-order';
import TransferOrders from './transfer-orders';

/**
 * A namespaced client for the
 * `/v1/ordering` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.ordering;
 * ```
 *
 * @param {AmadeusClient} client
 * @property {TransferOrders} transferOrders
 * @property {TransferOrder} transferOrder
 */
export default class Ordering {
  public transferOrders: TransferOrders;
  public transferOrder: (orderId: string) => TransferOrder;

  constructor(private readonly client: AmadeusClient) {
    this.transferOrders = new TransferOrders(this.client);
    this.transferOrder = (orderId: string) =>
      new TransferOrder(this.client, orderId);
  }
}
