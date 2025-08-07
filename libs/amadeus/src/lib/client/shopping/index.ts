import AmadeusClient from '../../services/amadeus-client.service';
import Activities from './activities';
import Activity from './activity';
import Availability from './availability';
import FlightDates from './flight-dates';
import FlightDestinations from './flight-destinations';
import FlightOffersSearch from './flight-offers-search';
import FlightOffers from './flight_offers';
import HotelOfferSearch from './hotel-offer-search';
import HotelOffersSearch from './hotel-offers-search';
import Seatmaps from './seatmaps';
import TransferOffers from './transfer-offers';

/**
 * A namespaced client for the
 * `/v1/shopping`, `/v2/shopping` and `/v3/shopping` endpoints
 */
export default class Shopping {
  public flightDestinations: FlightDestinations;
  public flightOffers: FlightOffers;
  public flightOffersSearch: FlightOffersSearch;
  public flightDates: FlightDates;
  public seatmaps: Seatmaps;
  public hotelOffersSearch: HotelOffersSearch;
  public activities: Activities;
  public availability: Availability;
  public transferOffers: TransferOffers;

  constructor(private readonly client: AmadeusClient) {
    this.flightDestinations = new FlightDestinations(this.client);
    this.flightOffers = new FlightOffers(this.client);
    this.flightOffersSearch = new FlightOffersSearch(this.client);
    this.flightDates = new FlightDates(this.client);
    this.seatmaps = new Seatmaps(this.client);
    this.hotelOffersSearch = new HotelOffersSearch(this.client);
    this.activities = new Activities(this.client);
    this.availability = new Availability(this.client);
    this.transferOffers = new TransferOffers(this.client);
  }

  /**
   * Loads a namespaced path for a specific offer ID for Hotel Search V3
   *
   * @param {string} [offerId] The ID of the offer for a dedicated hotel
   * @return {HotelOfferSearch}
   **/
  public hotelOfferSearch(offerId: string) {
    return new HotelOfferSearch(this.client, offerId);
  }

  /**
   * Loads a namespaced path for a specific activity ID
   *
   * @param {string} [activityId] The ID of the activity for a dedicated tour or activity
   * @return {Activity}
   **/
  public activity(activityId: string) {
    return new Activity(this.client, activityId);
  }
}
