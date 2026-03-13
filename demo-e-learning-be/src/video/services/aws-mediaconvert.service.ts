import { Injectable } from '@nestjs/common';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

@Injectable()
export class AwsMediaConvertService {
  private mediaconvertClient: MediaConvertClient;

  constructor() {
    // ใช้ Endpoint ที่ก๊อปมาจากหน้า Dashboard ของ MediaConvert
    this.mediaconvertClient = new MediaConvertClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT || '', 
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async startTranscoding(s3Key: string, videoId: string) {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN || '';
    const templateName = process.env.AWS_MEDIACONVERT_TEMPLATE

    // พิกัดต้นฉบับ (Input) และ พิกัดปลายทาง (Destination)
    const inputPath = `s3://${bucketName}/${s3Key}`;
    const outputPath = `s3://${bucketName}/Video/output/vid-${videoId}/`;

    const command = new CreateJobCommand({
      Role: roleArn,
      JobTemplate: templateName,
      UserMetadata: {
        videoId: videoId 
      },
      Settings: {
        Inputs: [
          {
            FileInput: inputPath,
          },
        ],
        OutputGroups: [
          {
            Name: 'Apple HLS',
            OutputGroupSettings: {
              Type: 'HLS_GROUP_SETTINGS',
              HlsGroupSettings: {
                Destination: outputPath,
              },
            },
          },
        ],
      },
    });

    try {
      const response = await this.mediaconvertClient.send(command);
      console.log(`🚀 ส่งงานให้ MediaConvert สำเร็จ! Job ID: ${response.Job?.Id}`);
      return response.Job;
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการสั่ง MediaConvert:', error);
      throw error;
    }
  }
}