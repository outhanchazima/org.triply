import { Injectable } from '@nestjs/common';
import { AmadeusClient } from '@org.triply/amadeus';

@Injectable()
export class FlightsService {
  constructor(private readonly amadeus: AmadeusClient) {}

  async search(
    origin: string,
    destination: string,
    date: string,
    adults = '1',
  ) {
    return this.amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: parseInt(adults, 10),
    });
  }
}
