import { Controller, Get, Query, Param, Post, Body, Delete } from '@nestjs/common';
import { StorageService } from '../services/storage.service';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PdfService } from '../services/pdf.service';
import { AwsMediaConvertService } from '../services/aws-mediaconvert.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('video')
export class VideoController {

  private readonly dbFilePath = path.join(process.cwd(), 'mock-database.json');

  private readDatabase(): any[] {
    if (fs.existsSync(this.dbFilePath)) {
      const data = fs.readFileSync(this.dbFilePath, 'utf8');
      return JSON.parse(data);
    }
    return []; // ถ้ายังไม่มีไฟล์ ให้คืนค่า Array ว่างๆป
  }

  // ฟังก์ชันบันทึกข้อมูลลงไฟล์
  private saveDatabase(data: any[]) {
    fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  }
  
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
    private readonly pdfService: PdfService,
    private readonly mediaconvertService: AwsMediaConvertService
  ) {}

  private getSlidesConfigPath(videoId: string) {
    return path.join(process.cwd(), 'uploads', 'slides', videoId, 'slides.json');
  }

  @Get('upload-url')
  async getUploadUrl(@Query('fileName') fileName: string) {
    const result = await this.storageService.generateUploadUrl(fileName);
    
    // 🎯 อ่าน DB -> เพิ่มข้อมูล -> เซฟ DB
    const db = this.readDatabase();
    db.push({
      id: result.videoId,
      title: fileName,
      status: 'UPLOADING',
      originalS3Key: result.videoKey 
    });
    this.saveDatabase(db); // เซฟลงไฟล์ทันที!

    return result;
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

    // 🎯 1. ดึงข้อมูลล่าสุดจากไฟล์ JSON ก่อน
    const db = this.readDatabase();

    // กรณีที่ AWS หั่นไฟล์สำเร็จ
    if (payload.status === 'COMPLETED') {
      const videoId = payload.videoId; 
      const m3u8Url = payload.playlistUrl; 
      
      console.log(`✅ วิดีโอ ${videoId} หั่นเสร็จแล้ว!`);
      console.log(`🔗 Streaming URL: ${m3u8Url}`);

      // ค้นหาวิดีโอใน Database (ที่เพิ่งอ่านมาจากไฟล์)
      const videoIndex = db.findIndex(v => v.id === videoId);
      
      if (videoIndex !== -1) {
        // อัปเดตลิงก์สตรีมมิ่งเป็นของใหม่
        db[videoIndex].streamUrl = m3u8Url;
        
        // แนะนำให้เพิ่มการอัปเดต status ด้วย เพื่อให้หน้าบ้านเอาไปโชว์ได้ว่า "พร้อมเล่น"
        db[videoIndex].status = 'READY'; 
        
        // 🎯 2. สั่งเซฟข้อมูลกลับลงไปทับไฟล์ JSON!
        this.saveDatabase(db);
        console.log(`💾 อัปเดต Database สำเร็จ! วิดีโอ ${videoId} พร้อมเล่นแล้ว`);
      } else {
        console.warn(`⚠️ ไม่พบวิดีโอ ID: ${videoId} ในระบบ`);
      }
      
      return { message: 'Webhook received and database updated!' };
    }

    // กรณีที่ AWS หั่นไฟล์ไม่สำเร็จ (เช่น ไฟล์ต้นฉบับพัง)
    if (payload.status === 'ERROR') {
      console.error('❌ AWS หั่นไฟล์พัง:', payload.errorMessage);
      const videoId = payload.videoId;

      const videoIndex = db.findIndex(v => v.id === videoId);
      if (videoIndex !== -1) {
        db[videoIndex].streamUrl = 'error'; 
        
        // อัปเดตสถานะเป็น FAILED
        db[videoIndex].status = 'FAILED'; 
        
        // 🎯 3. อย่าลืมเซฟข้อมูลกลับลงไฟล์ JSON ด้วย
        this.saveDatabase(db);
        console.log(`💾 อัปเดตสถานะวิดีโอ ${videoId} เป็น Error`);
      }

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

  @Get(':id/slides')
  async getSlides(@Param('id') videoId: string) {
    const configPath = this.getSlidesConfigPath(videoId);

    if (!fs.existsSync(configPath)) {
      // กรณียังไม่มีไฟล์ config (อัปโหลดสไลด์ไว้แล้วในอดีตสมัย POC เดิม)
      // ให้ลองอ่านไฟล์รูปจากโฟลเดอร์แล้วสร้างข้อมูล slides ให้เอง
      const slidesDir = path.join(process.cwd(), 'uploads', 'slides', videoId);
      if (!fs.existsSync(slidesDir)) {
        return { slides: [] };
      }

      try {
        const files = fs.readdirSync(slidesDir)
          .filter((name) => name.toLowerCase().endsWith('.png') || name.toLowerCase().endsWith('.jpg'))
          .sort();

        const slides = files.map((fileName, index) => {
          // พยายามดึงเลขหน้าจากชื่อไฟล์ เช่น slide.1.png → 1
          const match = fileName.match(/(\d+)/);
          const page = match ? parseInt(match[1], 10) : index + 1;

          return {
            slideNumber: page,
            imageUrl: `http://localhost:3000/static/slides/${videoId}/${fileName}`,
            showAtTime: 0,
          };
        });

        // สร้างไฟล์ config ทิ้งไว้ให้รอบต่อไปใช้ได้เลย
        fs.writeFileSync(configPath, JSON.stringify(slides, null, 2), 'utf8');

        return { slides };
      } catch (error) {
        console.error('Error building slides from directory:', error);
        return { slides: [] };
      }
    }

    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const slides = JSON.parse(raw);
      return { slides };
    } catch (error) {
      console.error('Error reading slides config:', error);
      return { slides: [] };
    }
  }

  @Post(':id/slides/config')
  async saveSlidesConfig(
    @Param('id') videoId: string,
    @Body('slides') slides: any[],
  ) {
    if (!Array.isArray(slides)) {
      return { error: 'slides must be an array' };
    }

    const outputDir = path.join(process.cwd(), 'uploads', 'slides', videoId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const configPath = this.getSlidesConfigPath(videoId);

    try {
      fs.writeFileSync(configPath, JSON.stringify(slides, null, 2), 'utf8');
      return { message: 'Slides config saved', slides };
    } catch (error) {
      console.error('Error writing slides config:', error);
      return { error: 'Failed to save slides config' };
    }
  }

  @Delete(':id/slides')
  async deleteSlides(@Param('id') videoId: string) {
    const slidesDir = path.join(process.cwd(), 'uploads', 'slides', videoId);

    try {
      if (fs.existsSync(slidesDir)) {
        fs.rmSync(slidesDir, { recursive: true, force: true });
      }
      return { message: 'Slides deleted' };
    } catch (error) {
      console.error('Error deleting slides directory:', error);
      return { error: 'Failed to delete slides' };
    }
  }

  // สำรอง: เผื่อบางที่เรียกใช้แบบ POST แทน DELETE
  @Post(':id/slides/delete')
  async deleteSlidesByPost(@Param('id') videoId: string) {
    const slidesDir = path.join(process.cwd(), 'uploads', 'slides', videoId);

    try {
      if (fs.existsSync(slidesDir)) {
        fs.rmSync(slidesDir, { recursive: true, force: true });
      }
      return { message: 'Slides deleted' };
    } catch (error) {
      console.error('Error deleting slides directory (POST):', error);
      return { error: 'Failed to delete slides' };
    }
  }

  @Post('upload-complete')
  async handleUploadComplete(@Body('videoId') videoId: string) {
    if (!videoId) {
      return { error: 'Missing videoId' };
    }

    console.log(`📥 ได้รับแจ้งว่าอัปโหลดเสร็จแล้วสำหรับ Video ID: ${videoId}`);

    // 🎯 1. อ่าน Database ล่าสุดจากไฟล์ JSON
    const db = this.readDatabase();
    
    // ค้นหาวิดีโอ
    const videoIndex = db.findIndex(v => v.id === videoId);
    if (videoIndex === -1) {
      return { error: 'Video not found' };
    }

    const video = db[videoIndex];
    const s3Key = video.originalS3Key; // พิกัดไฟล์ต้นฉบับที่เราเซฟไว้ตอนขอ URL

    // 🎯 2. อัปเดตสถานะเป็น PROCESSING แล้วเซฟลงไฟล์ JSON ทันที!
    db[videoIndex].status = 'PROCESSING';
    this.saveDatabase(db);

    // 3. สั่ง MediaConvert ให้เริ่มหั่นวิดีโอ!
    try {
      await this.mediaconvertService.startTranscoding(s3Key, videoId);
      return { 
        message: 'เริ่มกระบวนการหั่นวิดีโอแล้ว', 
        status: 'PROCESSING' 
      };
    } catch (error) {
      // (Option เสริม) ถ้าสั่งหั่นวิดีโอไม่สำเร็จ ให้ปรับสถานะเป็น ERROR แล้วเซฟลงไฟล์
      console.error('❌ สั่ง MediaConvert ไม่สำเร็จ:', error);
      db[videoIndex].status = 'ERROR';
      this.saveDatabase(db);
      
      return { error: 'ไม่สามารถสั่งหั่นวิดีโอได้' };
    }
  }

}