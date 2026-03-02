// apps/triply.api/src/modules/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { SharedModule } from '@org.triply/shared';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SharedModule, AuthDatabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
