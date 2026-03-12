import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import { ProgressController } from './controllers/progress.controller';
import { ProgressService } from './services/progress.service';

@Module({
  imports: [
    // ─── Kafka Producer Registration ───────────────────────────────────────────
    // ClientsModule.register() สร้าง ClientKafka instance ที่ inject ได้
    // ผ่าน @Inject('KAFKA_SERVICE') ใน Controller / Service
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            // clientId ต้องแตกต่างจาก Consumer clientId ใน main.ts
            clientId: 'elearning-producer-client',
            brokers: ['localhost:9092'],
          },
          producer: {
            // และกำจัด WARN ที่ขึ้นตอน Startup
            createPartitioner: Partitioners.LegacyPartitioner,

            // Topics จะถูกสร้างอัตโนมัติโดย kafka-init service แล้ว
            // ตั้งเป็น false เพื่อให้ชัดเจนว่า Topic ต้องมีอยู่ก่อน
            allowAutoTopicCreation: false,
          },
        },
      },
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
