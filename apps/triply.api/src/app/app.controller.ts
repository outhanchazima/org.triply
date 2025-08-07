import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('flights/search')
  async searchFlights(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
    @Query('adults') adults = '1'
  ) {
    this.logger.log(`Flight Search Inititated for: FROM: ${origin} TO: ${destination} DATE: ${date} ADULTS: ${adults}`)
    if (!origin || !destination || !date) {
      throw new HttpException(
        'Missing required parameters: origin, destination, date',
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.appService.searchFlights(origin, destination, date, adults);
  }
}
