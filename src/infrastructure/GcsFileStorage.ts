import { bucket } from "../config/storage";
import { FileStorage } from "./FileStorage";

export class GcsFileStorage implements FileStorage {
  async delete(path: string): Promise<void> {
    await bucket.file(path).delete({ ignoreNotFound: true });
  }
}
