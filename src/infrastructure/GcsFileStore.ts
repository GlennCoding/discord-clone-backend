import { bucket } from "../config/storage";
import { FileStore } from "./FileStore";

export class GcsFileStore implements FileStore {
  async delete(path: string): Promise<void> {
    await bucket.file(path).delete({ ignoreNotFound: true });
  }
}
