import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as crypto from 'crypto';

@Injectable()
export class LocalStorageService implements StorageService {
  async generateUploadUrl(fileName: string): Promise<{ 
    uploadUrl: string; 
    videoKey: string; 
    videoId: string; 
  }> {
    // 1. สร้าง ID จำลอง
    const videoId = crypto.randomUUID();
    
    // 2. สร้าง Key จำลอง
    const videoKey = `Video/local-input/${videoId}-${fileName}`; 

    // 3. คืนค่าให้ตรงกับรูปแบบใหม่ (Mock URL)
    return { 
      uploadUrl: 'http://localhost:3000/mock-upload-url', // ลิงก์อัปโหลดจำลอง
      videoKey: videoKey, 
      videoId: videoId 
    };
  }
}