import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  FileAsset,
  FileAssetDocument,
  FileAssetSchema,
} from '../schemas/file-asset.schema';
import { BaseMongoRepository } from './base-mongo.repository';
import { MongoService } from '../services/mongo.service';

@Injectable()
export class FileAssetRepository extends BaseMongoRepository<FileAssetDocument> {
  constructor(mongoService: MongoService) {
    super(mongoService, 'main', FileAsset.name, FileAssetSchema);
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<FileAssetDocument | null> {
    return this.model.findById(id).exec();
  }

  async removeById(id: string | Types.ObjectId): Promise<boolean> {
    const deleted = await this.model.findByIdAndDelete(id).exec();
    return deleted !== null;
  }
}
