// libs/database/src/lib/schemas/approval-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { BusinessRole, SystemRole } from './enums';

export enum ApprovalScope {
  SYSTEM = 'system',
  BUSINESS = 'business',
}

export enum ApprovalMode {
  AUTO_APPROVE = 'auto_approve',
  SECOND_APPROVAL = 'second_approval',
}

export type ApprovalPolicyDocument = HydratedDocument<ApprovalPolicy>;

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
export class ApprovalPolicy extends Document {
  @Prop({
    type: String,
    enum: Object.values(ApprovalScope),
    required: true,
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
    required: true,
    trim: true,
    lowercase: true,
    set: normalizeActionKey,
    index: true,
  })
  actionKey!: string;

  @Prop({
    type: String,
    enum: Object.values(ApprovalMode),
    default: ApprovalMode.AUTO_APPROVE,
  })
  mode!: ApprovalMode;

  @Prop({
    type: [String],
    enum: Object.values(BusinessRole),
    default: [],
  })
  businessApproverRoles!: BusinessRole[];

  @Prop({
    type: [String],
    enum: Object.values(SystemRole),
    default: [],
  })
  systemApproverRoles!: SystemRole[];

  @Prop({ type: Boolean, default: true })
  isEnabled!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ApprovalPolicySchema =
  SchemaFactory.createForClass(ApprovalPolicy);

ApprovalPolicySchema.index(
  { scope: 1, actionKey: 1, businessId: 1 },
  { unique: true },
);
ApprovalPolicySchema.index({ scope: 1, businessId: 1, isEnabled: 1 });

ApprovalPolicySchema.pre('validate', function () {
  if (typeof this.actionKey === 'string') {
    this.actionKey = normalizeActionKey(this.actionKey);
  }

  if (this.scope === ApprovalScope.BUSINESS && !this.businessId) {
    throw new Error('businessId is required when scope is set to business');
  }

  if (this.scope === ApprovalScope.SYSTEM) {
    this.businessId = null;
  }

  this.businessApproverRoles = Array.from(
    new Set(this.businessApproverRoles || []),
  );
  this.systemApproverRoles = Array.from(
    new Set(this.systemApproverRoles || []),
  );
});
