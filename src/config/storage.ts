import { Storage, StorageOptions } from "@google-cloud/storage";
import { env } from "../utils/env";
import { isProdEnv } from "../utils/helper";

const credentials: StorageOptions = isProdEnv
  ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
  : {
      apiEndpoint: "http://localhost:4443",
      projectId: "discord-clone",
    };

const storage = new Storage(credentials);

const bucket = storage.bucket(env.GCS_BUCKET_NAME);

const ensureBucket = async (bucketName: string) => {
  const [exists] = await bucket.exists();
  if (!exists) {
    if (isProdEnv) {
      throw Error(`${bucketName} bucket doesn't exist`);
    } else {
      await storage.createBucket(bucketName);
      console.log(`Bucket ${bucketName} created.`);
    }
  }
  console.log(`Bucket connection successful`);
};

ensureBucket(env.GCS_BUCKET_NAME).catch((err) => {
  console.error("Error ensuring bucket:", err);
});

export { storage, bucket };
