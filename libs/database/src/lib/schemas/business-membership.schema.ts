// libs/database/src/lib/schemas/business-membership.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { BusinessRole, MembershipStatus, Permission } from './enums';

export type BusinessMembershipDocument = HydratedDocument<BusinessMembership>;

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
export class BusinessMembership extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(BusinessRole),
    required: true,
  })
  role!: BusinessRole;

  @Prop({
    type: [String],
    enum: Object.values(Permission),
    default: [],
  })
  extraPermissions!: Permission[];

  @Prop({
    type: [String],
    enum: Object.values(Permission),
    default: [],
  })
  deniedPermissions!: Permission[];

  @Prop({
    type: String,
    enum: Object.values(MembershipStatus),
    default: MembershipStatus.INVITED,
    index: true,
  })
  status!: MembershipStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  invitedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  invitedAt!: Date | null;

  @Prop({ type: Date, default: null })
  joinedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BusinessMembershipSchema =
  SchemaFactory.createForClass(BusinessMembership);

// Compound indexes
BusinessMembershipSchema.index({ userId: 1, businessId: 1 }, { unique: true });
BusinessMembershipSchema.index({ businessId: 1, role: 1 });
BusinessMembershipSchema.index({ userId: 1, status: 1 });
BusinessMembershipSchema.index({ businessId: 1, status: 1 });
