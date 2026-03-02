// libs/shared/src/lib/guards/system-user.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

/**
 * Guard that ensures the user is a system user (isSystemUser === true)
 * Use this on system administration endpoints
 */
@Injectable()
export class SystemUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) {
      throw new ForbiddenException('Access denied. User not authenticated.');
    }

    if (!user.isSystemUser) {
      throw new ForbiddenException(
        'Access denied. System user privileges required.',
      );
    }

    return true;
  }
}
