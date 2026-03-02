import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { ScheduleModule } from '@nestjs/schedule'; 
import { ProgressModule } from './progress/progress.module';
import { ServeStaticModule } from '@nestjs/serve-static'; 
import { join } from 'path'; 

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/static', 
    }),
    ScheduleModule.forRoot(),
    ProgressModule,
    VideoModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}