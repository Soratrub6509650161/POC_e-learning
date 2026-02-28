import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { ScheduleModule } from '@nestjs/schedule/dist/schedule.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProgressModule,
    VideoModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}