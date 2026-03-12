import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { HeartbeatDto } from '../dto/heartbeat.dto';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  // 📝 Mockup Redis
  private redisCache = new Map<string, number>();

  // 📝 Mockup Database
  private databaseMock = new Map<string, any>();

  // ─── Existing: Legacy Direct-Write Handler ──────────────────────────────────

  async handleIncomingTracking(dto: UpdateProgressDto) {
    const key = `${dto.userId}:${dto.videoId}`;

    if (dto.currentTime === 0 && dto.eventType === 'LEAVE_PAGE') {
      // ลองเช็คดูว่าใน Cache หรือใน DB มีเวลาที่เยอะกว่า 0 เก็บไว้ไหม?
      const existingCache = this.redisCache.get(key) || 0;
      const existingDb = this.databaseMock.get(key)?.lastTime || 0;
      const maxTimeWeHave = Math.max(existingCache, existingDb);

      if (maxTimeWeHave > 0) {
        this.logger.warn(
          `🚫 [Backend Validation] ปฏิเสธการเอา 0 วินาทีมาทับเวลาเดิม! (ดึงเวลาเดิม ${maxTimeWeHave}s มาใช้แทน)`,
        );
        dto.currentTime = maxTimeWeHave;
      }
    }

    // 1. อัปเดตลง Cache (Redis) ตามปกติ
    this.redisCache.set(key, dto.currentTime);
    this.logger.debug(`[Cache Update] ${key} -> ${dto.currentTime}s`);

    // 2. ถ้าเป็นเหตุการณ์สำคัญ (ดูจบ หรือ ออกจากหน้าเว็บ)
    if (dto.eventType === 'ENDED' || dto.eventType === 'LEAVE_PAGE') {
      this.logger.log(`🚨 [Event: ${dto.eventType}] กำลังบันทึกตรงลง DB...`);
      this.syncToDatabase(key, dto.currentTime);
    }
  }

  // 🧹 Cron Job กวาดข้อมูลจาก Cache ลง DB ทุก 30 วินาที
  @Cron(CronExpression.EVERY_30_SECONDS)
  handleProgressSync() {
    if (this.redisCache.size === 0) return;

    this.logger.log('🧹 [Cron] เริ่มกวาดข้อมูลจาก Redis ลง Database...');

    // กวาดข้อมูลทั้งหมดที่มีใน Redis ณ ตอนนี้
    this.redisCache.forEach((time, key) => {
      this.syncToDatabase(key, time);
    });

    this.logger.log(
      `✅ [Cron] ซิงค์และล้าง Cache สำเร็จทั้งหมด ${this.redisCache.size} รายการ`,
    );
  }

  // --- 🛠️ ฟังก์ชันบันทึก และ ล้าง Redis ---
  private syncToDatabase(key: string, time: number) {
    // 1. บันทึกลง Database (Mock)
    this.databaseMock.set(key, {
      lastTime: time,
      updatedAt: new Date(),
    });
    this.logger.warn(`💾 [DB Saved] ${key} บันทึกเวลาที่ ${time} วินาที`);

    // 2. 🔥 ขั้นตอนสำคัญ: ลบออกจาก Redis ทันทีหลังจากลง DB แล้ว!
    this.redisCache.delete(key);
    this.logger.log(`🧹 [Redis Clean] ลบข้อมูล ${key} ออกจาก Cache เรียบร้อย`);
  }

  getResumeTime(userId: string, videoId: string): number {
    const key = `${userId}:${videoId}`;

    // ลองหาใน Database ก่อน
    const data = this.databaseMock.get(key);
    if (data) {
      return data.lastTime;
    }
    return 0; // ถ้าไม่เคยดูเลย ให้เริ่มที่ 0
  }

  // ─── NEW: Kafka Consumer Handler ────────────────────────────────────────────
  //
  // ฟังก์ชันนี้ถูกเรียกโดย @MessagePattern('video-progress-events') ใน Controller
  // ทุกครั้งที่มี Message ใหม่เข้ามาจาก Kafka Topic
  //
  // Flow จริงในอนาคต (TODO):
  //   1. Validate / Sanitize ข้อมูล HeartbeatDto
  //   2. HSET ลง Redis:  HSET progress:<userId>:<videoId> currentTime <value>
  //   3. EXPIRE key ไว้ 1 ชั่วโมง เผื่อ User ปิด Browser กะทันหัน
  //   4. Cron Job (handleProgressSync) จะกวาดจาก Redis → Database เอง
  // ──────────────────────────────────────────────────────────────────────────

  async processHeartbeat(data: HeartbeatDto): Promise<void> {
    const key = `${data.userId}:${data.videoId}`;

    this.logger.log(
      `📨 [Kafka] Message consumed — key=${key} | ` +
        `from=${data.from}s → to=${data.to}s | currentTime=${data.currentTime}s`,
    );

    // ── TODO: แทนที่ console.log ด้านล่างด้วย Redis Client จริงๆ ──────────────
    //
    // ตัวอย่าง (ioredis):
    //   await this.redisClient.hset(`progress:${key}`, 'currentTime', data.currentTime);
    //   await this.redisClient.expire(`progress:${key}`, 3600);
    //
    // ──────────────────────────────────────────────────────────────────────────
    console.log(
      `[Mock Redis] HSET progress:${key} currentTime ${data.currentTime}`,
    );
    console.log(`[Mock Redis] EXPIRE progress:${key} 3600`);

    this.logger.debug(
      `✅ [Mock Redis Saved] ${key} → currentTime=${data.currentTime}s (จำลองการบันทึกลง Redis เรียบร้อย)`,
    );
  }
}
