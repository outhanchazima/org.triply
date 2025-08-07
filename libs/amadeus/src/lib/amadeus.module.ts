import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import AmadeusClient from './services/amadeus-client.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AmadeusClient],
  exports: [AmadeusClient],
})
export class AmadeusModule {}
