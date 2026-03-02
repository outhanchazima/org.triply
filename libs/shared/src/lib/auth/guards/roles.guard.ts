// libs/shared/src/lib/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for an endpoint
 */
export const Roles = (...roles: string[]) => {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    } else {
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) {
      throw new ForbiddenException('Access denied. User not authenticated.');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => {
      // Check system role
      if (user.isSystemUser && user.activeRole === role) {
        return true;
      }
      // Check business role
      if (user.activeRole === role) {
        return true;
      }
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
