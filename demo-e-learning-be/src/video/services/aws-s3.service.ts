import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class AwsS3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '', 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async generateUploadUrl(fileName: string): Promise<{ uploadUrl: string, videoKey: string, videoId: string }> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    
    // สร้าง Video ID แบบสุ่ม (UUID)
    const videoId = crypto.randomUUID();
    
    const key = `Video/input/${videoId}-${fileName}`; 

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: 'video/mp4',
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    return { 
      uploadUrl: url, 
      videoKey: key, 
      videoId: videoId 
    };
  }
}