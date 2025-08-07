import AmadeusClient from '../../services/amadeus-client.service';
import Transfers from './transfer-orders/transfers';

/**
 * A namespaced client for the
 * `/v1/ordering/transfer-orders/XXXXX` endpoints
 *
 * Access via the {@link Amadeus} object
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.ordering.transferOrder('XXX');
 * ```
 *
 * @param {AmadeusClient} client
 * @param {string} orderId
 */
export default class TransferOrder {
  private orderId: string;
  public transfers: Transfers;

  constructor(private readonly client: AmadeusClient, orderId: string) {
    this.orderId = orderId;
    this.transfers = new Transfers(this.client, orderId);
  }
}
