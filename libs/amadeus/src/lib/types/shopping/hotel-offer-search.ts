import { HotelOffers } from './hotel-offers-search';

export type HotelOfferSearchParams = {
  lang?: string;
};

export type HotelOfferSearchResult = {
  data: HotelOffers;
};
