import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { AuditService } from './services/audit.service';

@Module({
  imports: [AuthDatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
