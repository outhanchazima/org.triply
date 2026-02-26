import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RequestService } from './services/request.service';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [],
  providers: [RequestService],
  exports: [RequestService, HttpModule],
})
export class SharedModule {}
