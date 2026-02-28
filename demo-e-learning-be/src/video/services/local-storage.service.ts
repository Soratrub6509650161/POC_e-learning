import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService implements StorageService {
  async generateUploadUrl(fileName: string): Promise<string> {
    // จำลองการสร้าง URL สำหรับให้ Frontend ยิงไฟล์เข้ามาที่เครื่องของเราเอง
    return `http://localhost:3000/video/mock-upload?fileName=${fileName}`;
  }
}