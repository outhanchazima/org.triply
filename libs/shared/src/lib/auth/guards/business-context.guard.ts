// libs/shared/src/lib/guards/business-context.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

/**
 * Guard that ensures the user has an active business context selected
 * Use this on all business-scoped endpoints
 */
@Injectable()
export class BusinessContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) {
      throw new ForbiddenException('Access denied. User not authenticated.');
    }

    // System users don't need business context
    if (user.isSystemUser) {
      return true;
    }

    // Check if user has an active business context
    if (!user.activeBusinessId) {
      throw new ForbiddenException(
        'Business context required. Please select a business or activate traveller mode.',
      );
    }

    return true;
  }
}
