import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfisicalConfigService } from './services/infisical-config.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [InfisicalConfigService],
  exports: [InfisicalConfigService],
})
export class SharedModule {}
