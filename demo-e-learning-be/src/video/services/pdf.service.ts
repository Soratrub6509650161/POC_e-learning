import { Injectable } from '@nestjs/common';
import { fromPath } from 'pdf2pic';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PdfService {
  async convertPdfToImages(pdfFilePath: string, videoId: string) {
    const outputDirectory = path.join(
      process.cwd(),
      'uploads',
      'slides',
      videoId,
    );

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    // ตั้งค่าตัวแปลงไฟล์ pdf2pic
    const options = {
      density: 300,
      saveFilename: 'slide',
      savePath: outputDirectory,
      format: 'png',
      width: 1920,
      height: 1080,
    };

    const convert = fromPath(pdfFilePath, options);

    try {
      console.log(`กำลังแปลงสไลด์ของวิดีโอ ${videoId}...`);

      const results = await convert.bulk(-1, { responseType: 'image' }); // เปลี่ยนตรงนี้ให้เป็น Single quote ด้วยเพื่อความสม่ำเสมอ

      console.log('แปลงไฟล์สำเร็จ!');

      return results.map((result) => ({
        slideNumber: result.page,
        imageUrl: `http://localhost:3000/static/slides/${videoId}/${result.name}`,
        showAtTime: 0,
      }));
    } catch (error) {
      console.error('Error converting PDF:', error);
      throw new Error('Failed to convert PDF to images');
    }
  }
}
