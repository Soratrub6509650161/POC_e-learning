import { Controller, Get, Query, Param, Post, Body} from '@nestjs/common';
import { StorageService } from '../services/storage.service';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PdfService } from '../services/pdf.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('video')
export class VideoController {
  
  // จำลอง Database ไว้ตรงนี้ เพื่อให้ทุก API ในนี้เรียกใช้ข้อมูลชุดเดียวกันได้
  private mockVideoDb = [
    {
      id: 'bb9e8c8e-d20a-44f9-816c-571f43b31fdb',
      title: 'วิดีโอทดสอบ (Big Buck Bunny)',
      thumbnail: 'https://placehold.co/600x400?text=Big+Buck+Bunny',
      // เปลี่ยนมาใช้ลิงก์ HLS ทดสอบของจริงบนอินเทอร์เน็ต
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 
      duration: '10:00'
    },
    {
      id: '8101bd57-a6bf-4629-b91c-775f6e290b56',
      title: 'วิดีโอทดสอบ (Tears of Steel)',
      thumbnail: 'https://placehold.co/600x400?text=Tears+of+Steel',
      // ลิงก์ทดสอบอีกอัน เผื่ออยากลองคลิกดูความต่าง
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      duration: '12:20'
    }
  ];

  constructor(
    private readonly storageService: StorageService,
    private readonly pdfService: PdfService 
  ) {}

  @Get('upload-url')
  async getUploadUrl(@Query('fileName') fileName: string) {
    if (!fileName) {
      return { error: 'Please provide a fileName' };
    }
    const url = await this.storageService.generateUploadUrl(fileName);
    return {
      message: 'success',
      uploadUrl: url,
      fileName: fileName
    };
  }

  @Get('list')
  findAll() {
    return this.mockVideoDb;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const video = this.mockVideoDb.find(v => v.id === id);
    if (!video) {
      return { error: 'Video not found' };
    }
    return video;
  }

  // 🚀 [API ใหม่] เส้นนี้เตรียมไว้ให้ AWS ยิงเข้ามาตอนหั่นไฟล์เสร็จ!
  @Post('webhook/aws-mediaconvert')
  handleAwsWebhook(@Body() payload: any) {
    console.log('--- AWS ยิง Webhook มาแล้ว! ---');
    console.log('ข้อมูลที่ส่งมา:', payload);

    // สมมติว่า Lambda ของพี่เขาส่งข้อมูลมาหน้าตาแบบนี้
    if (payload.status === 'COMPLETED') {
      const videoId = payload.videoId; // ID ที่เราใช้ผูกกับ Database
      const m3u8Url = payload.playlistUrl; // ลิงก์ CloudFront ที่หั่นเสร็จแล้ว
      
      console.log(`✅ วิดีโอ ${videoId} หั่นเสร็จแล้ว!`);
      console.log(`🔗 Streaming URL: ${m3u8Url}`);

      // TODO: เอา m3u8Url ไปอัปเดตลง Database ในช่อง streamUrl
      // เช่น this.database.update(videoId, { streamUrl: m3u8Url, isCompleted: true })
      
      return { message: 'Webhook received and database updated!' };
    }

    if (payload.status === 'ERROR') {
      console.error('❌ AWS หั่นไฟล์พัง:', payload.errorMessage);
      // TODO: อัปเดตสถานะใน DB ว่า Error แจ้งเตือน User
      return { message: 'Error logged' };
    }

    return { message: 'Ignored' };
  }

  @Post(':id/slides/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        // สร้างโฟลเดอร์เก็บ PDF ต้นฉบับ (uploads/pdf)
        const uploadPath = path.join(process.cwd(), 'uploads', 'pdf');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์ใหม่เพื่อป้องกันชื่อซ้ำ
        cb(null, `${Date.now()}-${file.originalname}`);
      }
    })
  }))
  async uploadSlides(
    @Param('id') videoId: string, 
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      return { error: 'กรุณาอัปโหลดไฟล์ PDF' };
    }

    try {
      // โยนไฟล์ PDF ไปให้ PdfService จัดการแปลงเป็นรูป
      const slidesData = await this.pdfService.convertPdfToImages(file.path, videoId);

      return {
        message: 'อัปโหลดและแปลงสไลด์สำเร็จ!',
        slides: slidesData
      };
    } catch (err) {
      console.error(err);
      return { error: 'เกิดข้อผิดพลาดในการแปลงไฟล์ PDF' };
    }
  }













}