import { Module } from '@nestjs/common';
import { VideoController } from './controllers/video.controller';
import { StorageService } from './services/storage.service';
import { LocalStorageService } from './services/local-storage.service';

@Module({
  controllers: [VideoController],
  providers: [
    {
      provide: StorageService,
      useClass: LocalStorageService, 
    },
  ],
})
export class VideoModule {}