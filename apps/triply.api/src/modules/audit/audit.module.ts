// apps/triply.api/src/modules/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { SharedModule } from '@org.triply/shared';
import { AuditController } from './audit.controller';

@Module({
  imports: [SharedModule],
  controllers: [AuditController],
})
export class ApiAuditModule {}
