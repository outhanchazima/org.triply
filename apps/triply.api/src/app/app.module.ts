import { Module } from '@nestjs/common';
import { AmadeusModule } from '@org.triply/amadeus';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AmadeusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
