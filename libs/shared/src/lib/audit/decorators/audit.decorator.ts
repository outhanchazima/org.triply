// libs/shared/src/lib/audit/decorators/audit.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@org.triply/database';

export const AUDIT_METADATA_KEY = 'audit:config';

export interface AuditConfig {
  action: AuditAction;
  resource: string;
  resourceIdParam?: string;
  includePayload?: boolean;
}

/**
 * Attach audit metadata to route handlers for automatic interception.
 */
export const Audit = (config: AuditConfig) =>
  SetMetadata(AUDIT_METADATA_KEY, config);
