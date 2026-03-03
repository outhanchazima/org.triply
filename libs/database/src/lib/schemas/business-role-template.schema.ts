// libs/database/src/lib/schemas/business-role-template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { BusinessRole, Permission } from './enums';

export type BusinessRoleTemplateDocument =
  HydratedDocument<BusinessRoleTemplate>;

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
export class BusinessRoleTemplate extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, default: null, trim: true, maxlength: 300 })
  description!: string | null;

  @Prop({
    type: String,
    enum: Object.values(BusinessRole),
    required: true,
  })
  baseRole!: BusinessRole;

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

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BusinessRoleTemplateSchema =
  SchemaFactory.createForClass(BusinessRoleTemplate);

BusinessRoleTemplateSchema.index({ businessId: 1, name: 1 }, { unique: true });
BusinessRoleTemplateSchema.index({ businessId: 1, isActive: 1 });
