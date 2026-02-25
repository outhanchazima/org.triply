import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { FlightsService } from './flights.service';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  private readonly logger = new Logger(FlightsController.name);

  constructor(private readonly flightsService: FlightsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search flight offers' })
  @ApiResponse({
    status: 200,
    description: 'Flight offers returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async search(@Query() query: SearchFlightsDto) {
    this.logger.log(
      `Flight search: ${query.origin} → ${query.destination} on ${query.date} (${query.adults} adults)`,
    );

    return this.flightsService.search(
      query.origin,
      query.destination,
      query.date,
      query.adults,
    );
  }
}
