export interface FileStorage {
  delete(path: string): Promise<void>;
}
