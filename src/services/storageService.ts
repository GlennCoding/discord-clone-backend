import { bucket } from "../config/storage";
import { env } from "../utils/env";
import { isProdEnv } from "../utils/helper";

export const getLocalUrl = (bucketName: string, blobName: string): string => {
  const encodedBlobName = encodeURIComponent(blobName);
  return `${env.GCS_PUBLIC_URL}/storage/v1/b/${bucketName}/o/${encodedBlobName}?alt=media`;
};

const UPLOAD_TIMEOUT_MS = 15_000; // 15 seconds

export const uploadFileToBucket = async (
  file: Express.Multer.File,
  fileName: string,
  contentType: string
): Promise<string> => {
  const blob = bucket.file(fileName);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      blobStream.destroy(new Error("Upload timed out"));
    }, UPLOAD_TIMEOUT_MS);

    blobStream.on("error", async (err: any) => {
      clearTimeout(timeout);
      try {
        await blob.delete({ ignoreNotFound: true });
      } catch {}
      reject(err);
    });

    blobStream.on("finish", async () => {
      clearTimeout(timeout);
      let publicUrl;
      if (isProdEnv) {
        publicUrl = await blob.publicUrl();
      } else {
        publicUrl = getLocalUrl(bucket.name, blob.name);
      }
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

export const deleteFileFromBucket = async (path: string) => {
  return await bucket.file(path).delete({ ignoreNotFound: true });
};
