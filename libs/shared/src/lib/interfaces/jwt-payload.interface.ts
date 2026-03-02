// libs/shared/src/lib/interfaces/jwt-payload.interface.ts

/**
 * JWT Payload structure - frontend-ready with feature flags
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: string;

  /** User email */
  email: string;

  /** Display name */
  displayName: string;

  /** Avatar URL */
  avatarUrl: string | null;

  /** Whether user has an active traveller profile */
  isTraveller: boolean;

  /** Whether user is a system user */
  isSystemUser: boolean;

  /** Currently active business context */
  activeBusinessId: string | null;

  /** Name of active business */
  activeBusinessName: string | null;

  /** Role in active business */
  activeRole: string | null;

  /** All business memberships for switcher UI */
  memberships: {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
    role: string;
    status: string;
  }[];

  /** Computed permissions for active context */
  permissions: string[];

  /** Frontend feature flags derived from permissions */
  featureFlags: {
    canManageBusiness: boolean;
    canInviteStaff: boolean;
    canViewFinance: boolean;
    canViewAudit: boolean;
    canCreateBookings: boolean;
    canSubmitKyc: boolean;
    canReviewKyc: boolean;
    canManageUsers: boolean;
    isReadOnly: boolean;
    isSystemUser: boolean;
  };

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;
}

/**
 * Request with user payload
 */
export interface RequestWithUser extends Request {
  user: JwtPayload;
}
