import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestService } from './services/request.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [RequestService],
  exports: [RequestService],
})
export class SharedModule {}
