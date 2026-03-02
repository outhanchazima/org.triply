// apps/triply.api/src/modules/business/business.module.ts
import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { SharedModule } from '@org.triply/shared';

@Module({
  imports: [SharedModule, AuthDatabaseModule],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
