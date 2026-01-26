/**
 * Abstraction for reading/writing binary objects to the backing store.
 * Implementations should be side-effect free beyond storage interactions.
 */
export type FileStorage = {
  /**
   * Uploads the given file buffer to the provided object key.
   * `contentType` must be the MIME type that matches the data; callers must validate size/type upstream.
   * Resolves with a publicly accessible URL (or signed URL) once the object is persisted.
   */
  upload(
    file: Express.Multer.File,
    key: string,
    contentType: string,
  ): Promise<string>;

  /**
   * Deletes the object at `path`. Should be idempotent: missing objects are treated as success.
   */
  deleteObject(path: string): Promise<void>;
}
