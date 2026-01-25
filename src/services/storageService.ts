import { bucket } from "../config/storage";
import { isProdOrProdLocalEnv } from "../utils/helper";
import { getLocalUrl } from "../utils/storage";

const UPLOAD_TIMEOUT_MS = 15_000; // 15 seconds

export const uploadFileToBucket = async (
  file: Express.Multer.File,
  fileName: string,
  contentType: string,
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
      if (isProdOrProdLocalEnv) {
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
