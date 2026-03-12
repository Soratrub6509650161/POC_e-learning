import { Module } from '@nestjs/common';
import { VideoController } from './controllers/video.controller';
import { StorageService } from './services/storage.service';
import { LocalStorageService } from './services/local-storage.service';
import { PdfService } from './services/pdf.service'; 
import { AwsMediaConvertService } from './services/aws-mediaconvert.service';

@Module({
  controllers: [VideoController],
  providers: [
    {
      provide: StorageService,
      useClass: LocalStorageService, 
    },
    PdfService,
    AwsMediaConvertService
  ],
})
export class VideoModule {}