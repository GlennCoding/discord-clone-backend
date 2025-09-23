import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  apiEndpoint: "http://localhost:4443",
  projectId: "discord-clone",
});

const ensureBucket = async (bucketName: string) => {
  const bucket = storage.bucket(bucketName);
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

export { storage, ensureBucket };
