import { StorageProvider } from '../constants/file-upload.constants';

export interface UploadedStoredFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  folder: string;
  objectKey: string;
  url: string;
  path?: string;
  location: string;
  storageProvider: StorageProvider;
}
