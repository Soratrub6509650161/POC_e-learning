export abstract class StorageService {
  abstract generateUploadUrl(fileName: string): Promise<{ 
    uploadUrl: string; 
    videoKey: string; 
    videoId: string; 
  }>;
}