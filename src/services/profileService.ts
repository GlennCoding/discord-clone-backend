import type { FileStorage } from '../infrastructure/FileStorage';

export class ProfileService {
  constructor(private fileStorage: FileStorage) {}

  async uploadProfileImg(
    file: Express.Multer.File,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    return this.fileStorage.upload(file, fileName, contentType);
  }

  async deleteProfileImg(path: string): Promise<void> {
    return this.fileStorage.deleteObject(path);
  }
}
