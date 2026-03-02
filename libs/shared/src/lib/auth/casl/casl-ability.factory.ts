// libs/shared/src/lib/auth/casl/casl-ability.factory.ts
import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { BusinessRole, Permission, SystemRole } from '@org.triply/database';
import { JwtPayload } from '../../interfaces/jwt-payload.interface';

export type AppAbility = MongoAbility;

@Injectable()
export class CaslAbilityFactory {
  /**
   * Create CASL ability from JWT payload.
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

    if (isSystemUser && activeRole === SystemRole.SUPER_USER) {
      can('manage', 'all');
      return build();
    }

    for (const permission of permissions) {
      const ability = this.permissionToAbility(permission);
      if (!ability) {
        continue;
      }

      const condition =
        !isSystemUser &&
        activeBusinessId &&
        this.isBusinessScopedSubject(ability.subject)
          ? { businessId: activeBusinessId }
          : undefined;

      if (condition) {
        can(ability.action, ability.subject, condition);
      } else {
        can(ability.action, ability.subject);
      }
    }

    if (isSystemUser && activeRole) {
      this.applySystemRules(can, cannot, activeRole as SystemRole);
    }

    if (isTraveller) {
      can('read', 'User', { _id: sub });
      can('update', 'User', { _id: sub });
      cannot('delete', 'User', { _id: sub });
    }

    if (!isSystemUser && activeBusinessId && activeRole) {
      this.applyBusinessRules(
        can,
        cannot,
        activeRole as BusinessRole,
        activeBusinessId,
        sub,
      );
    }

    return build();
  }

  /**
   * Check if a user has a specific permission.
   */
  hasPermission(jwtPayload: JwtPayload, permission: Permission): boolean {
    return jwtPayload.permissions.includes(permission);
  }

  /**
   * Check if user has any permission from a list.
   */
  hasAnyPermission(jwtPayload: JwtPayload, permissions: Permission[]): boolean {
    return permissions.some((permission) =>
      jwtPayload.permissions.includes(permission),
    );
  }

  /**
   * Check if user has all permissions from a list.
   */
  hasAllPermissions(
    jwtPayload: JwtPayload,
    permissions: Permission[],
  ): boolean {
    return permissions.every((permission) =>
      jwtPayload.permissions.includes(permission),
    );
  }

  private applySystemRules(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    role: SystemRole,
  ): void {
    if (role === SystemRole.SYSTEM_ADMIN) {
      cannot('delete', 'Business');
    }

    if (role === SystemRole.SYSTEM_AUDITOR) {
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
      cannot('approve', 'all');
      cannot('reject', 'all');
      cannot('suspend', 'all');
    }

    // System users remain isolated from business membership actions.
    cannot('manage', 'BusinessMembership');
  }

  private applyBusinessRules(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    role: BusinessRole,
    activeBusinessId: string,
    userId: string,
  ): void {
    if (role === BusinessRole.BUSINESS_OWNER) {
      can('manage', 'Business', { _id: activeBusinessId });
      can('manage', 'BusinessMembership', { businessId: activeBusinessId });
      can('read', 'User', { businessId: activeBusinessId });
      can('update', 'User', { _id: userId });
      cannot('delete', 'User', { _id: userId });
      cannot('manage', 'Business', {
        _id: { $ne: activeBusinessId },
      });
      return;
    }

    if (role === BusinessRole.BUSINESS_AGENT) {
      can('read', 'Business', { _id: activeBusinessId });
      can('read', 'BusinessMembership', { businessId: activeBusinessId });
      can('create', 'Booking');
      can('update', 'User', { _id: userId });
      return;
    }

    if (role === BusinessRole.BUSINESS_FINANCE) {
      can('read', 'Business', { _id: activeBusinessId });
      can('read', 'Finance', { businessId: activeBusinessId });
      can('update', 'User', { _id: userId });
      return;
    }

    if (role === BusinessRole.BUSINESS_AUDITOR) {
      can('read', 'all', { businessId: activeBusinessId });
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
    }
  }

  private permissionToAbility(
    permission: string,
  ): { action: string; subject: string } | null {
    const [resource, operation] = permission.split(':');
    if (!resource || !operation) {
      return null;
    }

    const subjectMap: Record<string, string> = {
      user: 'User',
      business: 'Business',
      member: 'BusinessMembership',
      booking: 'Booking',
      finance: 'Finance',
      audit: 'Audit',
      system: 'System',
      kyc: 'Kyc',
    };

    const actionMap: Record<string, string> = {
      create: 'create',
      read: 'read',
      update: 'update',
      delete: 'delete',
      manage: 'manage',
      approve: 'approve',
      reject: 'reject',
      suspend: 'suspend',
      export: 'export',
      impersonate: 'impersonate',
      user_provision: 'provision',
      approve_kyc: 'approve',
    };

    const subject = subjectMap[resource];
    const action = actionMap[operation];

    if (!subject || !action) {
      return null;
    }

    return { action, subject };
  }

  private isBusinessScopedSubject(subject: string): boolean {
    return [
      'Business',
      'BusinessMembership',
      'Booking',
      'Finance',
      'Audit',
      'Kyc',
    ].includes(subject);
  }
}
