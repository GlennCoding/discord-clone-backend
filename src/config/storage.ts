import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  apiEndpoint: "http://localhost:4443",
  projectId: "discord-clone",
});

const bucket = storage.bucket("profile-pictures");

const ensureBucket = async (bucketName: string) => {
  const [exists] = await bucket.exists();
  if (!exists) {
    await storage.createBucket(bucketName);
    console.log(`Bucket ${bucketName} created.`);
  }
  console.log(`Bucket connection successful`);
};

ensureBucket("profile-pictures").catch((err) => {
  console.error("Error ensuring bucket:", err);
});

export { storage, bucket };
