import { bucket } from "../config/storage";
import { env } from "../utils/env";

export const getPublicProfileImgUrl = (buketName: string, blobName: string) => {
  const encodedBlobName = encodeURIComponent(blobName);

  const localUrl = `${env.GCS_PUBLIC_URL}/storage/v1/b/${buketName}/o/${encodedBlobName}?alt=media`;
  const productionUrl = `${env.GCS_PUBLIC_URL}/${buketName}/${encodedBlobName}`;

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return localUrl;

  return productionUrl;
};

const UPLOAD_TIMEOUT_MS = 10_000; // 10 seconds

export const uploadProfileImgToBucket = async (
  file: Express.Multer.File,
  fileName: string
): Promise<string> => {
  const blob = bucket.file(fileName);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
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

    blobStream.on("finish", () => {
      clearTimeout(timeout);
      resolve(getPublicProfileImgUrl(bucket.name, blob.name) as string);
    });

    blobStream.end(file.buffer);
  });
};

export const deleteProfileImgFromBucket = async (path: string) => {
  return await bucket.file(path).delete({ ignoreNotFound: true });
};
