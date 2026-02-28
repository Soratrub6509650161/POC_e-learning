import { Module } from '@nestjs/common';
import { ProgressController } from './controllers/progress.controller';
import { ProgressService } from './services/progress.service';

@Module({
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}