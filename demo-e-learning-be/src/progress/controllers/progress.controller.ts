import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ProgressService } from '../services/progress.service';
import { UpdateProgressDto } from '../dto/update-progress.dto';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  async updateProgress(@Body() updateProgressDto: UpdateProgressDto) {
    await this.progressService.handleIncomingTracking(updateProgressDto);
    return { success: true, timestamp: new Date().toISOString() };
  }

  @Get('resume')
  getResumeTime(
    @Query('userId') userId: string, 
    @Query('videoId') videoId: string
  ) {
    const savedTime = this.progressService.getResumeTime(userId, videoId);
    return { resumeTime: savedTime };
  }
}