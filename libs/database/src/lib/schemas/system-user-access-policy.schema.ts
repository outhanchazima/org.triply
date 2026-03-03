// libs/database/src/lib/schemas/system-user-access-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type SystemUserAccessPolicyDocument =
  HydratedDocument<SystemUserAccessPolicy>;

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
export class SystemUserAccessPolicy extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  allowedIps!: string[];

  @Prop({ type: [String], default: [] })
  deniedIps!: string[];

  @Prop({ type: Boolean, default: true })
  requireStepUpOnUnknownIp!: boolean;

  @Prop({ type: Boolean, default: true })
  requireStepUpOnUnknownDevice!: boolean;

  @Prop({ type: Boolean, default: true })
  notifyOnRiskEvent!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SystemUserAccessPolicySchema = SchemaFactory.createForClass(
  SystemUserAccessPolicy,
);
