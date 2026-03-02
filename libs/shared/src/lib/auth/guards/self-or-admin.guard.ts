// libs/shared/src/lib/guards/self-or-admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

/**
 * Guard that allows access if the user is accessing their own resource
 * OR if the user has the USER_UPDATE permission (admin)
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private readonly paramName = 'userId') {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user: JwtPayload; params: Record<string, string> }>();
    const { user, params } = request;

    if (!user) {
      throw new ForbiddenException('Access denied. User not authenticated.');
    }

    const resourceUserId = params[this.paramName];

    // Allow if accessing own resource
    if (resourceUserId && user.sub === resourceUserId) {
      return true;
    }

    // Allow if has USER_UPDATE permission (admin)
    if (user.permissions.includes('user:update')) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied. You can only access your own resources.',
    );
  }
}
