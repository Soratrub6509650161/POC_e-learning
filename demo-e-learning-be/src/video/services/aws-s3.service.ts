import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AwsS3Service {
  private s3Client: S3Client;

  constructor() {
    // เตรียมรับ Key จากพี่ๆ ทีม Infra (แนะนำให้ดึงจาก process.env ในของจริง)
    this.s3Client = new S3Client({
      region: 'ap-southeast-1', // สมมติว่าเป็นสิงคโปร์
      credentials: {
        accessKeyId: 'รอพี่เขาให้มา', 
        secretAccessKey: 'รอพี่เขาให้มา',
      },
    });
  }

  async generateUploadUrl(fileName: string): Promise<string> {
    const bucketName = 'รอชื่อ-bucket-จากพี่เขา';
    // ตั้งชื่อไฟล์ใน S3 (อาจจะใส่ Date.now() กันชื่อซ้ำ)
    const key = `raw-videos/${Date.now()}-${fileName}`; 

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: 'video/mp4', // บังคับว่าต้องเป็น MP4
    });

    // สร้าง URL ที่มีอายุ 1 ชั่วโมง (3600 วินาที)
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return url;
  }
}