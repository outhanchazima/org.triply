// libs/database/src/lib/schemas/business.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { BusinessStatus, BusinessType, KycDocumentType } from './enums';

export interface KycDocument {
  type: KycDocumentType;
  url: string;
  fileId?: Types.ObjectId | null;
  uploadedAt: Date;
  verified: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface KycData {
  businessType: BusinessType | null;
  taxId: string | null;
  incorporationDate: Date | null;
  address: Address | null;
  documents: KycDocument[];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: Types.ObjectId | null;
  rejectionReason: string | null;
}

export type OwnershipTransferStatus = 'none' | 'pending' | 'accepted';

export interface OwnershipTransferData {
  status: OwnershipTransferStatus;
  proposedOwnerId: Types.ObjectId | null;
  initiatedBy: Types.ObjectId | null;
  initiatedAt: Date | null;
  acceptedAt: Date | null;
}

export type BusinessDocument = HydratedDocument<Business>;

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
export class Business extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  registrationNumber!: string;

  @Prop({
    type: String,
    enum: Object.values(BusinessStatus),
    default: BusinessStatus.PENDING_KYC,
    index: true,
  })
  status!: BusinessStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  ownerId!: Types.ObjectId;

  // KYC data
  @Prop({
    type: {
      businessType: { type: String, enum: Object.values(BusinessType) },
      taxId: { type: String, default: null },
      incorporationDate: { type: Date, default: null },
      address: {
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        country: { type: String, default: null },
        postalCode: { type: String, default: null },
      },
      documents: [
        {
          type: { type: String, enum: Object.values(KycDocumentType) },
          url: { type: String, required: true },
          fileId: { type: Types.ObjectId, ref: 'FileAsset', default: null },
          uploadedAt: { type: Date, default: Date.now },
          verified: { type: Boolean, default: false },
        },
      ],
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: Types.ObjectId, ref: 'User', default: null },
      rejectionReason: { type: String, default: null },
    },
    default: () => ({
      businessType: null,
      taxId: null,
      incorporationDate: null,
      address: null,
      documents: [],
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    }),
  })
  kyc!: KycData;

  @Prop({ type: String, default: null })
  logoUrl!: string | null;

  @Prop({ type: String, default: null, trim: true })
  website!: string | null;

  @Prop({ type: String, default: null, trim: true })
  industry!: string | null;

  @Prop({
    type: {
      status: {
        type: String,
        enum: ['none', 'pending', 'accepted'],
        default: 'none',
      },
      proposedOwnerId: { type: Types.ObjectId, ref: 'User', default: null },
      initiatedBy: { type: Types.ObjectId, ref: 'User', default: null },
      initiatedAt: { type: Date, default: null },
      acceptedAt: { type: Date, default: null },
    },
    default: () => ({
      status: 'none',
      proposedOwnerId: null,
      initiatedBy: null,
      initiatedAt: null,
      acceptedAt: null,
    }),
  })
  ownershipTransfer!: OwnershipTransferData;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

// Indexes
BusinessSchema.index({ 'kyc.businessType': 1 });
BusinessSchema.index({ 'ownershipTransfer.status': 1 });
BusinessSchema.index({ createdAt: -1 });
