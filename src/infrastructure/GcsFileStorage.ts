import { isProdOrProdLocalEnv } from "../utils/helper";
import { getLocalUrl } from "../utils/storage";

import type { FileStorage } from "./FileStorage";
import type { Bucket as GcsBucket, File as GcsFile } from "@google-cloud/storage";

export class GcsFileStorage implements FileStorage {
  private readonly uploadTimeoutMs = 15_000;
  private readonly signedUrlExpiresMs = 1000 * 60 * 15; // 15 minutes
  private readonly cacheSeconds = 60 * 60 * 24 * 365; // 1 year for client caching

  constructor(private readonly bucket: GcsBucket) {}

  async upload(
    file: Express.Multer.File,
    key: string,
    contentType: string,
  ): Promise<string> {
    const blob = this.bucket.file(key);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType,
      metadata: {
        cacheControl: `public, max-age=${this.cacheSeconds}, immutable`,
      },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        blobStream.destroy(new Error("Upload timed out"));
      }, this.uploadTimeoutMs);

      blobStream.on("error", async (err: any) => {
        clearTimeout(timeout);
        try {
          await blob.delete({ ignoreNotFound: true });
        } catch {}
        reject(err);
      });

      blobStream.on("finish", async () => {
        clearTimeout(timeout);
        try {
          const downloadUrl = await this.createDownloadUrl(blob, contentType);
          resolve(downloadUrl);
        } catch (err) {
          try {
            await blob.delete({ ignoreNotFound: true });
          } catch {}
          reject(err);
        }
      });

      blobStream.end(file.buffer);
    });
  }

  private async createDownloadUrl(blob: GcsFile, contentType: string): Promise<string> {
    if (!isProdOrProdLocalEnv) {
      return getLocalUrl(this.bucket.name, blob.name);
    }

    const [signedUrl] = await blob.getSignedUrl({
      action: "read",
      expires: Date.now() + this.signedUrlExpiresMs,
      version: "v2",
      contentType,
    });

    return signedUrl;
  }

  async deleteObject(path: string): Promise<void> {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }

  async getDownloadUrl(
    path: string,
    options?: { contentType?: string; cacheSeconds?: number },
  ): Promise<string> {
    const blob = this.bucket.file(path);
    if (!isProdOrProdLocalEnv) {
      return getLocalUrl(this.bucket.name, blob.name);
    }

    const [signedUrl] = await blob.getSignedUrl({
      action: "read",
      expires: Date.now() + this.signedUrlExpiresMs,
      version: "v2",
      contentType: options?.contentType,
    });

    return signedUrl;
  }
}
