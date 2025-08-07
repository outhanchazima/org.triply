import AmadeusClient, {
  AmadeusResponse,
} from '../../services/amadeus-client.service';
import {
  HotelOfferSearchParams,
  HotelOfferSearchResult,
} from '../../types/shopping/hotel-offer-search';

/**
 * A namespaced client for the
 * `/v3/shopping/hotel-offers/:offer_id` endpoints
 *
 * ```ts
 * const amadeus = new Amadeus();
 * amadeus.shopping.hotelOfferSearch('XXX');
 * ```
 *
 * @param {AmadeusClient} client
 * @property {number} offerId
 */
export default class HotelOfferSearch {
  private offerId: string;

  constructor(private readonly client: AmadeusClient, offerId: string) {
    this.offerId = offerId;
  }

  /**
   * Returns details for a specific offer
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find details for the offer with ID 'XXX'
   *
   * ```ts
   *  amadeus.shopping.hotelOfferSearch('XXX').get();
   * ```
   */
  public get(
    params: HotelOfferSearchParams = {}
  ): Promise<AmadeusResponse<HotelOfferSearchResult>> {
    return this.client.get<HotelOfferSearchResult>(
      `/v3/shopping/hotel-offers/${this.offerId}`,
      params
    );
  }
}
