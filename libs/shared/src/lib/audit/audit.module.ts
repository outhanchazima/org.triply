import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@org.triply/database';
import { AuditService } from './services/audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [AuthDatabaseModule],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
