// libs/shared/src/lib/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@org.triply/database';
import type { Request } from 'express';
import { AuditService } from '../../audit/services';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 */
export const RequirePermissions = (...permissions: string[]) => {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
    } else {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    }
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: JwtPayload; method: string; originalUrl: string }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Access denied. User not authenticated.');
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !user.permissions.includes(permission),
      );

      await this.auditService.log(
        {
          action: AuditAction.PERMISSION_DENIED,
          resource: 'Permission',
          metadata: {
            requiredPermissions,
            missingPermissions,
            permission: missingPermissions[0] || requiredPermissions[0] || null,
            method: request.method,
            path: request.originalUrl,
          },
          success: false,
        },
        user,
        request as unknown as Request,
      );

      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
