import { env } from "../utils/env";

export const getPublicProfileImgUrl = (buketName: string, blobName: string) => {
  const encodedBlobName = encodeURIComponent(blobName);

  const localUrl = `${env.GCS_PUBLIC_URL}/storage/v1/b/${buketName}/o/${encodedBlobName}?alt=media`;
  const productionUrl = `${env.GCS_PUBLIC_URL}/${buketName}/${encodedBlobName}`;

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return localUrl;

  return productionUrl;
};
