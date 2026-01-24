export interface FileStore {
  delete(path: string): Promise<void>;
}
