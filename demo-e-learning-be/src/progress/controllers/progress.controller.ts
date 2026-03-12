import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  Inject,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { ProgressService } from '../services/progress.service';
import { UpdateProgressDto } from '../dto/update-progress.dto';

@Controller('progress')
export class ProgressController implements OnModuleInit {
  private readonly logger = new Logger(ProgressController.name);

  constructor(
    private readonly progressService: ProgressService,

    // ClientKafka instance ที่ลงทะเบียนไว้ใน ClientsModule (progress.module.ts)
    // ใช้สำหรับ Produce Message เข้า Kafka เท่านั้น (Producer Side)
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  // เชื่อมต่อ Kafka Producer ทันทีที่ Module โหลดเสร็จ
  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('✅ Kafka Producer connected (KAFKA_SERVICE)');
  }

  // ─── POST /progress ────────────────────────────────────────────────────────
  //
  // Frontend เรียก Endpoint นี้ทุก 5 วินาที (และ Event สำคัญต่างๆ)
  //
  // Flow เดิม (ก่อน Kafka):
  //   Frontend → POST /progress → handleIncomingTracking() → In-Memory Cache
  //
  // Flow ใหม่ (ผ่าน Kafka):
  //   Frontend → POST /progress → kafkaClient.emit() → return 200 ทันที
  //                                      ↓
  //                              Kafka Topic (buffer)
  //                                      ↓
  //                          @MessagePattern (background)
  //                                      ↓
  //                          handleIncomingTracking() → In-Memory Cache
  //
  // ผลที่ได้: Main Thread ไม่ถูก Block แม้มี User จำนวนมาก
  // Frontend ไม่ต้องเปลี่ยนโค้ดใดๆ ทั้งสิ้น
  // ──────────────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(200)
  updateProgress(@Body() dto: UpdateProgressDto) {
    // emit() = Fire and Forget: ส่งข้อมูลลง Kafka แล้ว return ทันที
    // ไม่รอให้ Consumer ประมวลผลเสร็จ → Main Thread ว่างรับ Request ถัดไปได้เลย
    this.kafkaClient.emit<void, UpdateProgressDto>(
      'video-progress-events',
      dto,
    );

    this.logger.debug(
      `📤 [Emitted] userId=${dto.userId} videoId=${dto.videoId} ` +
        `currentTime=${dto.currentTime}s eventType=${dto.eventType}`,
    );

    // Response กลับ Frontend ทันที ก่อนที่ Kafka Consumer จะเริ่มประมวลผลด้วยซ้ำ
    return { success: true, timestamp: new Date().toISOString() };
  }

  // ─── GET /progress/resume ──────────────────────────────────────────────────

  @Get('resume')
  getResumeTime(
    @Query('userId') userId: string,
    @Query('videoId') videoId: string,
  ) {
    const savedTime = this.progressService.getResumeTime(userId, videoId);
    return { resumeTime: savedTime };
  }

  // ─── Kafka Consumer ────────────────────────────────────────────────────────
  //
  // รับ Message จาก Topic 'video-progress-events' ใน Background
  // ทำงานแยก Thread จาก HTTP Server โดยสมบูรณ์
  //
  // @Payload() — NestJS Deserialize ค่าจาก Kafka Message Value ให้อัตโนมัติ
  //              ดึงเฉพาะ field 'data' ออกมา (NestJS KafkaRequestSerializer)
  // ──────────────────────────────────────────────────────────────────────────

  @MessagePattern('video-progress-events')
  async handleVideoProgressEvent(@Payload() data: UpdateProgressDto) {
    this.logger.debug(
      `📥 [Consumed] userId=${data.userId} videoId=${data.videoId} ` +
        `currentTime=${data.currentTime}s eventType=${data.eventType}`,
    );

    // Logic เดิมทั้งหมดยังอยู่ครบ:
    //   - Validate currentTime=0 กรณี LEAVE_PAGE
    //   - อัปเดต In-Memory Cache (จำลอง Redis)
    //   - Sync ลง DB ทันทีสำหรับ ENDED / LEAVE_PAGE
    //   - Cron Job กวาด Cache ลง DB ทุก 30 วิ
    await this.progressService.handleIncomingTracking(data);
  }
}
