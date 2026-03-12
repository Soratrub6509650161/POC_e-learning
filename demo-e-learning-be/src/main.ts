// ── Silence KafkaJS v2 partitioner warning ────────────────────────────────────
// ServerKafka สร้าง internal producer ของตัวเอง ซึ่งไม่สามารถส่ง
// Partitioners.LegacyPartitioner เข้าไปได้โดยตรงผ่าน NestJS config
// วิธีที่ถูกต้องคือ set env var นี้ก่อนที่ kafkajs module จะ load
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // ─── Kafka Microservice (Consumer Side) ──────────────────────────────────────
  // connectMicroservice() ลงทะเบียน Kafka Consumer ไว้กับ Hybrid App
  // NestJS จะ Subscribe Topic ที่มี @MessagePattern ให้อัตโนมัติ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'elearning-consumer-client',
        brokers: ['localhost:9092'],

        // ── Fix: GroupCoordinator Race Condition ──────────────────────────────
        // ตอน Startup Kafka ต้อง elect Leader ของ __consumer_offsets topic ก่อน
        // ถ้า KafkaJS ถามหา GroupCoordinator เร็วเกินไป จะได้ ERROR สีแดงใน Log
        // แม้ว่ามันจะ retry และ join group ได้เองใน ~3 วิ แต่ทำให้ Log ดูน่ากลัว
        //
        // initialRetryTime: 3000 → รอ 3 วิก่อน retry attempt แรก
        // retries: 10            → พยายามซ้ำสูงสุด 10 ครั้ง (default คือ 5)
        //
        // ผลที่ได้: ลดโอกาสที่ ERROR แดงจะขึ้น เพราะ Kafka มีเวลา warm up
        // ก่อนที่ KafkaJS จะเริ่ม attempt แรก
        retry: {
          initialRetryTime: 3000,
          retries: 10,
        },
      },
      consumer: {
        // groupId ต้องไม่ซ้ำกับ Producer clientId
        groupId: 'video-progress-consumer-group',
      },
    },
  });

  // ต้องเรียก startAllMicroservices() ก่อน listen() เสมอ
  // เพื่อให้ Consumer พร้อมรับ Message ก่อนที่ HTTP Server จะเปิด
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `🚀 HTTP Server is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `📨 Kafka Consumer is listening on: localhost:9092 (group: video-progress-consumer-group)`,
  );
}

bootstrap();
