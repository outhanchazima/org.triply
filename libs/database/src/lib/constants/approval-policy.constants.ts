// libs/database/src/lib/constants/approval-policy.constants.ts
import { AdminApprovalActionType } from '../schemas/admin-approval.schema';
import { ApprovalMode } from '../schemas/approval-policy.schema';
import { BusinessRole, SystemRole } from '../schemas/enums';

export interface SystemApprovalPolicyDefault {
  actionKey: string;
  mode: ApprovalMode;
  systemApproverRoles: SystemRole[];
}

export interface BusinessApprovalPolicyDefault {
  actionKey: string;
  mode: ApprovalMode;
  businessApproverRoles: BusinessRole[];
}

export const SYSTEM_APPROVAL_POLICY_DEFAULTS: SystemApprovalPolicyDefault[] = [
  {
    actionKey: AdminApprovalActionType.SUSPEND_BUSINESS,
    mode: ApprovalMode.SECOND_APPROVAL,
    systemApproverRoles: [SystemRole.SYSTEM_ADMIN, SystemRole.SUPER_USER],
  },
  {
    actionKey: AdminApprovalActionType.PROVISION_SUPER_USER,
    mode: ApprovalMode.SECOND_APPROVAL,
    systemApproverRoles: [SystemRole.SYSTEM_ADMIN, SystemRole.SUPER_USER],
  },
];

export const BUSINESS_APPROVAL_POLICY_DEFAULTS: BusinessApprovalPolicyDefault[] =
  [
    {
      actionKey: 'finance:export',
      mode: ApprovalMode.SECOND_APPROVAL,
      businessApproverRoles: [
        BusinessRole.BUSINESS_OWNER,
        BusinessRole.BUSINESS_FINANCE,
      ],
    },
    {
      actionKey: 'finance:refund',
      mode: ApprovalMode.SECOND_APPROVAL,
      businessApproverRoles: [
        BusinessRole.BUSINESS_OWNER,
        BusinessRole.BUSINESS_FINANCE,
      ],
    },
    {
      actionKey: 'finance:payout',
      mode: ApprovalMode.SECOND_APPROVAL,
      businessApproverRoles: [
        BusinessRole.BUSINESS_OWNER,
        BusinessRole.BUSINESS_FINANCE,
      ],
    },
  ];

export function normalizeApprovalActionKey(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveDefaultSystemApprovalPolicy(
  actionKey: string,
): SystemApprovalPolicyDefault {
  const normalized = normalizeApprovalActionKey(actionKey);
  const matched = SYSTEM_APPROVAL_POLICY_DEFAULTS.find(
    (policy) => policy.actionKey === normalized,
  );

  if (matched) {
    return {
      actionKey: matched.actionKey,
      mode: matched.mode,
      systemApproverRoles: [...matched.systemApproverRoles],
    };
  }

  return {
    actionKey: normalized,
    mode: ApprovalMode.AUTO_APPROVE,
    systemApproverRoles: [],
  };
}

export function resolveDefaultBusinessApprovalPolicy(
  actionKey: string,
): BusinessApprovalPolicyDefault {
  const normalized = normalizeApprovalActionKey(actionKey);
  const matched = BUSINESS_APPROVAL_POLICY_DEFAULTS.find(
    (policy) => policy.actionKey === normalized,
  );

  if (matched) {
    return {
      actionKey: matched.actionKey,
      mode: matched.mode,
      businessApproverRoles: [...matched.businessApproverRoles],
    };
  }

  if (normalized.startsWith('finance:')) {
    return {
      actionKey: normalized,
      mode: ApprovalMode.SECOND_APPROVAL,
      businessApproverRoles: [
        BusinessRole.BUSINESS_OWNER,
        BusinessRole.BUSINESS_FINANCE,
      ],
    };
  }

  return {
    actionKey: normalized,
    mode: ApprovalMode.AUTO_APPROVE,
    businessApproverRoles: [],
  };
}
