import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SearchFlightsDto } from './dto/search-flights.dto';

@ApiTags('flights')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API root' })
  getData() {
    return this.appService.getData();
  }

  @Get('flights/search')
  @ApiOperation({ summary: 'Search flight offers' })
  @ApiResponse({
    status: 200,
    description: 'Flight offers returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async searchFlights(@Query() query: SearchFlightsDto) {
    this.logger.log(
      `Flight search: ${query.origin} → ${query.destination} on ${query.date} (${query.adults} adults)`,
    );

    return this.appService.searchFlights(
      query.origin,
      query.destination,
      query.date,
      query.adults,
    );
  }
}
