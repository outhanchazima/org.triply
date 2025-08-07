import { Injectable } from '@nestjs/common';
import { AmadeusClient } from '@org.triply/amadeus';

@Injectable()
export class AppService {
  constructor(private readonly amadeus: AmadeusClient) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  public async searchFlights(
    origin: string,
    destination: string,
    date: string,
    adults = '1'
  ) {
    return await this.amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: parseInt(adults, 10),
    });
  }
}
