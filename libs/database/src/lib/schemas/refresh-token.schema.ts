// libs/database/src/lib/schemas/refresh-token.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret.tokenHash;
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class RefreshToken extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, select: false })
  tokenHash!: string;

  // Expiration handled via schema-level TTL index on `expiresAt`.
  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: String, default: null })
  deviceInfo!: string | null;

  @Prop({ type: String, default: null })
  ipAddress!: string | null;

  @Prop({ type: Boolean, default: false })
  isRevoked!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Indexes
RefreshTokenSchema.index({ tokenHash: 1 }, { sparse: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
