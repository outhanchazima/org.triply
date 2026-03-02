import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type FileAssetDocument = HydratedDocument<FileAsset>;

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
export class FileAsset extends Document {
  @Prop({ required: true, trim: true })
  originalName!: string;

  @Prop({ required: true, trim: true, index: true })
  filename!: string;

  @Prop({ required: true, trim: true, index: true })
  mimeType!: string;

  @Prop({ required: true, min: 0 })
  size!: number;

  @Prop({ required: true, trim: true, index: true })
  folder!: string;

  @Prop({ required: true, trim: true, index: true })
  storageProvider!: string;

  @Prop({ required: true, trim: true })
  url!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);

FileAssetSchema.index({ createdAt: -1 });
FileAssetSchema.index({ folder: 1, createdAt: -1 });
