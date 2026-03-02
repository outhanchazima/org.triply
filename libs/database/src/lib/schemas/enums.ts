// libs/database/src/lib/schemas/enums.ts

/**
 * User type enumeration - determines the primary identity class
 */
export enum UserType {
  TRAVELLER = 'traveller',
  BUSINESS = 'business',
  SYSTEM = 'system',
  GUEST = 'guest',
}

/**
 * Business role enumeration - roles within a business context
 */
export enum BusinessRole {
  BUSINESS_OWNER = 'business_owner',
  BUSINESS_AGENT = 'business_agent',
  BUSINESS_FINANCE = 'business_finance',
  BUSINESS_AUDITOR = 'business_auditor',
}

/**
 * System role enumeration - roles for system/administrative users
 */
export enum SystemRole {
  SUPER_USER = 'super_user',
  SYSTEM_ADMIN = 'system_admin',
  SYSTEM_AUDITOR = 'system_auditor',
  SYSTEM_FINANCE = 'system_finance',
}

/**
 * Business status enumeration - tracks KYC and operational status
 */
export enum BusinessStatus {
  PENDING_KYC = 'pending_kyc',
  KYC_SUBMITTED = 'kyc_submitted',
  KYC_UNDER_REVIEW = 'kyc_under_review',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

/**
 * Business type enumeration - legal entity types
 */
export enum BusinessType {
  SOLE_PROPRIETOR = 'sole_proprietor',
  PARTNERSHIP = 'partnership',
  CORPORATION = 'corporation',
  NGO = 'ngo',
}

/**
 * Membership status enumeration - tracks invitation/join state
 */
export enum MembershipStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INVITED = 'invited',
  LEFT = 'left',
}

/**
 * OTP purpose enumeration - prevents cross-use between flows
 */
export enum OtpPurpose {
  LOGIN = 'login',
  VERIFY_EMAIL = 'verify_email',
  ONBOARDING = 'onboarding',
}

/**
 * KYC document type enumeration
 */
export enum KycDocumentType {
  REGISTRATION_CERT = 'registration_cert',
  TAX_CERT = 'tax_cert',
  DIRECTOR_ID = 'director_id',
  BANK_STATEMENT = 'bank_statement',
}

/**
 * Permission enumeration - granular, namespaced permissions
 */
export enum Permission {
  // Users
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',

  // Business management
  BUSINESS_CREATE = 'business:create',
  BUSINESS_READ = 'business:read',
  BUSINESS_UPDATE = 'business:update',
  BUSINESS_DELETE = 'business:delete',
  BUSINESS_SUSPEND = 'business:suspend',
  BUSINESS_APPROVE_KYC = 'business:approve_kyc',

  // Business membership / staff
  MEMBER_INVITE = 'member:invite',
  MEMBER_READ = 'member:read',
  MEMBER_UPDATE = 'member:update',
  MEMBER_REMOVE = 'member:remove',

  // KYC
  KYC_SUBMIT = 'kyc:submit',
  KYC_READ = 'kyc:read',
  KYC_REVIEW = 'kyc:review',
  KYC_APPROVE = 'kyc:approve',
  KYC_REJECT = 'kyc:reject',

  // Bookings
  BOOKING_CREATE = 'booking:create',
  BOOKING_READ = 'booking:read',
  BOOKING_UPDATE = 'booking:update',
  BOOKING_CANCEL = 'booking:cancel',

  // Finance
  FINANCE_READ = 'finance:read',
  FINANCE_MANAGE = 'finance:manage',
  FINANCE_EXPORT = 'finance:export',

  // Audit
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // System
  SYSTEM_MANAGE = 'system:manage',
  SYSTEM_USER_PROVISION = 'system:user_provision',
}

/**
 * Audit action enumeration - all auditable actions
 */
export enum AuditAction {
  // Auth
  LOGIN_OTP = 'login:otp',
  LOGIN_GOOGLE = 'login:google',
  LOGOUT = 'logout',
  OTP_SENT = 'otp:sent',
  OTP_FAILED = 'otp:failed',
  REFRESH_TOKEN_USED = 'token:refresh_used',
  REFRESH_TOKEN_REUSE_DETECTED = 'token:refresh_reuse_detected',
  CONTEXT_SWITCHED = 'context:switched',
  ACCOUNT_LOCKED = 'account:locked',

  // Users
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_IMPERSONATED = 'user:impersonated',

  // Business
  BUSINESS_CREATED = 'business:created',
  BUSINESS_UPDATED = 'business:updated',
  BUSINESS_SUSPENDED = 'business:suspended',

  // Membership
  MEMBER_INVITED = 'member:invited',
  MEMBER_JOINED = 'member:joined',
  MEMBER_REMOVED = 'member:removed',
  MEMBER_ROLE_CHANGED = 'member:role_changed',

  // KYC
  KYC_DETAILS_SUBMITTED = 'kyc:details_submitted',
  KYC_DOCUMENTS_UPLOADED = 'kyc:documents_uploaded',
  KYC_SUBMITTED = 'kyc:submitted',
  KYC_APPROVED = 'kyc:approved',
  KYC_REJECTED = 'kyc:rejected',

  // Security
  PERMISSION_DENIED = 'security:permission_denied',
  SUSPICIOUS_ACTIVITY = 'security:suspicious_activity',
}

/**
 * Role permissions mapping - default permissions per role
 */
export const ROLE_PERMISSIONS: Record<BusinessRole | SystemRole, Permission[]> =
  {
    // Business roles
    [BusinessRole.BUSINESS_OWNER]: [
      Permission.BUSINESS_READ,
      Permission.BUSINESS_UPDATE,
      Permission.MEMBER_INVITE,
      Permission.MEMBER_READ,
      Permission.MEMBER_UPDATE,
      Permission.MEMBER_REMOVE,
      Permission.KYC_SUBMIT,
      Permission.KYC_READ,
      Permission.BOOKING_READ,
      Permission.FINANCE_READ,
      Permission.AUDIT_READ,
    ],
    [BusinessRole.BUSINESS_AGENT]: [
      Permission.BUSINESS_READ,
      Permission.MEMBER_READ,
      Permission.BOOKING_CREATE,
      Permission.BOOKING_READ,
      Permission.BOOKING_UPDATE,
      Permission.BOOKING_CANCEL,
    ],
    [BusinessRole.BUSINESS_FINANCE]: [
      Permission.BUSINESS_READ,
      Permission.MEMBER_READ,
      Permission.BOOKING_READ,
      Permission.FINANCE_READ,
      Permission.FINANCE_MANAGE,
      Permission.FINANCE_EXPORT,
    ],
    [BusinessRole.BUSINESS_AUDITOR]: [
      Permission.BUSINESS_READ,
      Permission.MEMBER_READ,
      Permission.BOOKING_READ,
      Permission.FINANCE_READ,
      Permission.AUDIT_READ,
      Permission.AUDIT_EXPORT,
    ],

    // System roles
    [SystemRole.SUPER_USER]: Object.values(Permission),
    [SystemRole.SYSTEM_ADMIN]: [
      Permission.USER_CREATE,
      Permission.USER_READ,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.BUSINESS_READ,
      Permission.BUSINESS_SUSPEND,
      Permission.BUSINESS_APPROVE_KYC,
      Permission.KYC_READ,
      Permission.KYC_REVIEW,
      Permission.KYC_APPROVE,
      Permission.KYC_REJECT,
      Permission.SYSTEM_MANAGE,
      Permission.SYSTEM_USER_PROVISION,
      Permission.AUDIT_READ,
    ],
    [SystemRole.SYSTEM_AUDITOR]: [
      Permission.USER_READ,
      Permission.BUSINESS_READ,
      Permission.KYC_READ,
      Permission.BOOKING_READ,
      Permission.FINANCE_READ,
      Permission.AUDIT_READ,
      Permission.AUDIT_EXPORT,
    ],
    [SystemRole.SYSTEM_FINANCE]: [
      Permission.BUSINESS_READ,
      Permission.BOOKING_READ,
      Permission.FINANCE_READ,
      Permission.FINANCE_MANAGE,
      Permission.FINANCE_EXPORT,
    ],
  };

/**
 * Traveller permissions - base permissions for traveller users
 */
export const TRAVELLER_PERMISSIONS: Permission[] = [
  Permission.BOOKING_CREATE,
  Permission.BOOKING_READ,
  Permission.BOOKING_UPDATE,
  Permission.BOOKING_CANCEL,
];

/**
 * Feature flags derived from permissions - for frontend consumption
 */
export interface FeatureFlags {
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
}

/**
 * Compute feature flags from permissions array
 */
export function computeFeatureFlags(permissions: Permission[]): FeatureFlags {
  const has = (p: Permission) => permissions.includes(p);

  const isReadOnly =
    permissions.some((p) => p.startsWith('read')) &&
    !permissions.some(
      (p) =>
        p.includes('create') ||
        p.includes('update') ||
        p.includes('delete') ||
        p.includes('manage'),
    );

  return {
    canManageBusiness:
      has(Permission.BUSINESS_UPDATE) || has(Permission.BUSINESS_CREATE),
    canInviteStaff: has(Permission.MEMBER_INVITE),
    canViewFinance: has(Permission.FINANCE_READ),
    canViewAudit: has(Permission.AUDIT_READ),
    canCreateBookings: has(Permission.BOOKING_CREATE),
    canSubmitKyc: has(Permission.KYC_SUBMIT),
    canReviewKyc: has(Permission.KYC_REVIEW),
    canManageUsers: has(Permission.USER_CREATE) || has(Permission.USER_UPDATE),
    isReadOnly,
    isSystemUser: has(Permission.SYSTEM_MANAGE),
  };
}
