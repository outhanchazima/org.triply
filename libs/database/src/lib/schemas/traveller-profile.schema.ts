// libs/database/src/lib/schemas/traveller-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type TravellerProfileDocument = HydratedDocument<TravellerProfile>;

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
export class TravellerProfile extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ type: Date, default: null })
  dateOfBirth!: Date | null;

  @Prop({ type: String, default: null, trim: true })
  nationality!: string | null;

  // Encrypted at rest - stored encrypted
  @Prop({ type: String, default: null })
  passportNumber!: string | null;

  // Encrypted at rest - stored encrypted
  @Prop({ type: String, default: null })
  nationalId!: string | null;

  @Prop({
    type: Object,
    default: () => ({
      currency: 'USD',
      language: 'en',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    }),
  })
  preferences!: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TravellerProfileSchema =
  SchemaFactory.createForClass(TravellerProfile);

// Indexes
TravellerProfileSchema.index({ nationality: 1 });
