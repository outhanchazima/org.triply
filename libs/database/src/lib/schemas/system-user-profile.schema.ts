// libs/database/src/lib/schemas/system-user-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { SystemRole } from './enums';

export type SystemUserProfileDocument = HydratedDocument<SystemUserProfile>;

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
export class SystemUserProfile extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({
    type: String,
    enum: Object.values(SystemRole),
    required: true,
  })
  role!: SystemRole;

  @Prop({ type: String, default: null, trim: true })
  department!: string | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  provisionedBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SystemUserProfileSchema =
  SchemaFactory.createForClass(SystemUserProfile);

// Indexes
SystemUserProfileSchema.index({ role: 1 });
SystemUserProfileSchema.index({ provisionedBy: 1 });
