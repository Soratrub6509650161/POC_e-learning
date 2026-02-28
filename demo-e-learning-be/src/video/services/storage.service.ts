export abstract class StorageService {
  abstract generateUploadUrl(fileName: string): Promise<string>;
}