// libs/database/src/lib/schemas/admin-approval.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { BusinessRole, SystemRole } from './enums';
import { ApprovalScope } from './approval-policy.schema';

export enum AdminApprovalActionType {
  SUSPEND_BUSINESS = 'suspend_business',
  PROVISION_SUPER_USER = 'provision_super_user',
  BUSINESS_HIGH_RISK_ACTION = 'business_high_risk_action',
}

export enum AdminApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  EXPIRED = 'expired',
}

export type AdminApprovalDocument = HydratedDocument<AdminApproval>;

const normalizeActionKey = (value: string): string =>
  value.trim().toLowerCase();

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AdminApproval extends Document {
  @Prop({
    type: String,
    enum: Object.values(ApprovalScope),
    required: true,
    default: ApprovalScope.SYSTEM,
    index: true,
  })
  scope!: ApprovalScope;

  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    default: null,
    index: true,
  })
  businessId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: Object.values(AdminApprovalActionType),
    required: true,
    index: true,
  })
  actionType!: AdminApprovalActionType;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    set: normalizeActionKey,
    index: true,
  })
  actionKey!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requestedBy!: Types.ObjectId;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  requestNote!: string | null;

  @Prop({
    type: String,
    enum: Object.values(AdminApprovalStatus),
    default: AdminApprovalStatus.PENDING,
    index: true,
  })
  status!: AdminApprovalStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  approvedBy!: Types.ObjectId | null;

  @Prop({
    type: [String],
    enum: Object.values(BusinessRole),
    default: [],
  })
  requiredApproverBusinessRoles!: BusinessRole[];

  @Prop({
    type: [String],
    enum: Object.values(SystemRole),
    default: [],
  })
  requiredApproverSystemRoles!: SystemRole[];

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  approvalNote!: string | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  rejectionReason!: string | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  executedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AdminApprovalSchema = SchemaFactory.createForClass(AdminApproval);

AdminApprovalSchema.index({ status: 1, expiresAt: 1 });
AdminApprovalSchema.index({ actionType: 1, status: 1, createdAt: -1 });
AdminApprovalSchema.index({ requestedBy: 1, createdAt: -1 });
AdminApprovalSchema.index({
  scope: 1,
  businessId: 1,
  status: 1,
  createdAt: -1,
});
AdminApprovalSchema.index({ scope: 1, actionKey: 1, status: 1, createdAt: -1 });

AdminApprovalSchema.pre('validate', function () {
  if (typeof this.actionKey === 'string') {
    this.actionKey = normalizeActionKey(this.actionKey);
  }

  if (this.scope === ApprovalScope.BUSINESS && !this.businessId) {
    throw new Error('businessId is required when scope is set to business');
  }

  if (this.scope === ApprovalScope.SYSTEM) {
    this.businessId = null;
    this.requiredApproverBusinessRoles = [];
  } else {
    this.requiredApproverSystemRoles = [];
  }

  this.requiredApproverBusinessRoles = Array.from(
    new Set(this.requiredApproverBusinessRoles || []),
  );
  this.requiredApproverSystemRoles = Array.from(
    new Set(this.requiredApproverSystemRoles || []),
  );
});
