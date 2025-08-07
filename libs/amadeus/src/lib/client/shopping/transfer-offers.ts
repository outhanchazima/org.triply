import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  ShoppingTransferOffersParams,
  ShoppingTransferOffersResult,
} from '../../types/shopping/transfer-offers';

/**
 * A namespaced client for the `/v1/shopping/transfer-offers` endpoints
 */
export default class TransferOffers {
  constructor(private readonly client: AmadeusClient) {}

  /**
   * To search the list of transfer offers.
   * @param {ShoppingTransferOffersParams} params - The parameters for the transfer offers search.
   * @returns {Promise<AmadeusResponse<ShoppingTransferOffersResult>>}
   * @throws {Error} If the request fails or if required parameters are missing.
   * @example
   * const response = await amadeus.shopping.transferOffers.post(body);
   */
  public async post(
    params: ShoppingTransferOffersParams
  ): Promise<AmadeusResponse<ShoppingTransferOffersResult>> {
    return this.client.post<ShoppingTransferOffersResult>(
      '/v1/shopping/transfer-offers',
      params
    );
  }
}
