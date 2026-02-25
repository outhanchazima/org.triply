import { Module } from '@nestjs/common';
import { AmadeusModule } from '@org.triply/amadeus';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';

@Module({
  imports: [AmadeusModule],
  controllers: [FlightsController],
  providers: [FlightsService],
})
export class FlightsModule {}
