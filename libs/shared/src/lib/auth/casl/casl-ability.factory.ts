// libs/shared/src/lib/casl/casl-ability.factory.ts
import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import {
  BusinessRole,
  Permission,
  ROLE_PERMISSIONS,
  SystemRole,
} from '@org.triply/database';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

export type AppAbility = MongoAbility;

export type Subject = string;
export type Action = string;

@Injectable()
export class CaslAbilityFactory {
  /**
   * Create CASL ability for a user based on their JWT payload
   */
  createForUser(jwtPayload: JwtPayload): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    const {
      sub,
      isSystemUser,
      isTraveller,
      activeBusinessId,
      activeRole,
      permissions,
    } = jwtPayload;

    // super_user has all permissions
    if (permissions.includes(Permission.SYSTEM_MANAGE) && isSystemUser) {
      can('manage', 'all');
      return build();
    }

    // System roles
    if (isSystemUser) {
      this.defineSystemAbilities(can, cannot, activeRole as SystemRole, sub);
      return build();
    }

    // Traveller permissions (always available if isTraveller)
    if (isTraveller) {
      this.defineTravellerAbilities(can, cannot, sub);
    }

    // Business role permissions (only if active business context)
    if (activeBusinessId && activeRole) {
      this.defineBusinessAbilities(
        can,
        cannot,
        activeRole as BusinessRole,
        activeBusinessId,
        sub,
        permissions,
      );
    }

    return build();
  }

  /**
   * Define abilities for system users
   */
  private defineSystemAbilities(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    role: SystemRole | null,
    userId: string,
  ): void {
    if (!role) return;

    const permissions = ROLE_PERMISSIONS[role] || [];

    // Apply each permission as an ability
    for (const permission of permissions) {
      const [action, subject] = permission.split(':');
      if (action && subject) {
        can(action, subject);
      }
    }

    // System-specific restrictions
    if (role === SystemRole.SYSTEM_ADMIN) {
      cannot('delete', 'Business');
      cannot('delete', 'User');
    }

    if (role === SystemRole.SYSTEM_AUDITOR) {
      // Auditors are read-only
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
    }

    // System users cannot be members of businesses
    cannot('join', 'Business');
  }

  /**
   * Define abilities for traveller users
   */
  private defineTravellerAbilities(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    userId: string,
  ): void {
    // Travellers can manage their own profile and bookings
    can('read', 'User', { _id: userId });
    can('update', 'User', { _id: userId });
    can('create', 'Booking');
    can('read', 'Booking', { userId });
    can('update', 'Booking', { userId });
    can('delete', 'Booking', { userId });

    cannot('delete', 'User', { _id: userId }); // Cannot delete own account
  }

  /**
   * Define abilities for business users
   */
  private defineBusinessAbilities(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    role: BusinessRole,
    businessId: string,
    userId: string,
    permissions: string[],
  ): void {
    // Apply role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[role] || [];

    for (const permission of [...rolePermissions, ...permissions]) {
      const [action, subject] = permission.split(':');
      if (action && subject) {
        // Scope abilities to active business context
        if (subject === 'Business') {
          can(action, subject, { _id: businessId });
        } else if (subject === 'BusinessMembership') {
          can(action, subject, { businessId });
        } else if (subject === 'User') {
          // For User operations, only allow on self or within business context
          can(action, subject, { _id: userId });
        } else {
          // For other subjects, scope by businessId if applicable
          can(action, subject, { businessId });
        }
      }
    }

    // Business owner specific permissions
    if (role === BusinessRole.BUSINESS_OWNER) {
      can('manage', 'Business', { _id: businessId });
      can('manage', 'BusinessMembership', { businessId });
      can('manage', 'Kyc', { businessId });

      // Cannot manage other businesses
      cannot('manage', 'Business', { _id: { $ne: businessId } });
    }

    // Business auditor restrictions
    if (role === BusinessRole.BUSINESS_AUDITOR) {
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
    }

    // All business users can update their own profile
    can('update', 'User', { _id: userId });
    cannot('delete', 'User', { _id: userId });
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(jwtPayload: JwtPayload, permission: Permission): boolean {
    return jwtPayload.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(jwtPayload: JwtPayload, permissions: Permission[]): boolean {
    return permissions.some((p) => jwtPayload.permissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(
    jwtPayload: JwtPayload,
    permissions: Permission[],
  ): boolean {
    return permissions.every((p) => jwtPayload.permissions.includes(p));
  }
}
