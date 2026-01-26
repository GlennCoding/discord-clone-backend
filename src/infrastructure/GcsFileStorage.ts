import { isProdOrProdLocalEnv } from "../utils/helper";
import { getLocalUrl } from "../utils/storage";

import type { FileStorage } from "./FileStorage";
import type { Bucket as GcsBucket } from "@google-cloud/storage";

export class GcsFileStorage implements FileStorage {
  private readonly uploadTimeoutMs = 15_000;

  constructor(private readonly bucket: GcsBucket) {}

  async upload(file: Express.Multer.File, key: string, contentType: string): Promise<string> {
    const blob = this.bucket.file(key);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        blobStream.destroy(new Error("Upload timed out"));
      }, this.uploadTimeoutMs);

      blobStream.on("error", async (err: unknown) => {
        clearTimeout(timeout);
        try {
          await blob.delete({ ignoreNotFound: true });
        } catch {}
        reject(err);
      });

      blobStream.on("finish", async () => {
        clearTimeout(timeout);
        let publicUrl;
        if (isProdOrProdLocalEnv) {
          publicUrl = await blob.publicUrl();
        } else {
          publicUrl = getLocalUrl(this.bucket.name, blob.name);
        }
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  }
  async deleteObject(path: string): Promise<void> {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }
}
