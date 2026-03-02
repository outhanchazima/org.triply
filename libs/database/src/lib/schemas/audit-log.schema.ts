// libs/database/src/lib/schemas/audit-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { AuditAction } from './enums';

export type AuditLogDocument = HydratedDocument<AuditLog>;

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
export class AuditLog extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  actorId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  actorEmail!: string | null;

  @Prop({ type: [String], default: [] })
  actorRoles!: string[];

  @Prop({
    type: String,
    enum: Object.values(AuditAction),
    required: true,
    index: true,
  })
  action!: AuditAction;

  @Prop({ required: true, trim: true })
  resource!: string;

  @Prop({ type: String, default: null })
  resourceId!: string | null;

  @Prop({ type: Object, default: null })
  before!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  after!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  metadata!: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: Boolean, default: true })
  success!: boolean;

  @Prop({ type: String, default: null })
  failureReason!: string | null;

  // Override timestamps to use createdAt as TTL base
  createdAt!: Date;
  updatedAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for efficient querying
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years TTL
