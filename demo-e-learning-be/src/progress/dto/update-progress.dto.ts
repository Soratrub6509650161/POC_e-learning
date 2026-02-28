export class UpdateProgressDto {
  videoId: string;
  userId: string;
  currentTime: number;
  eventType: 'INTERVAL_5_SEC' | 'SEEKED' | 'PLAY' | 'PAUSE' | 'ENDED' | 'LEAVE_PAGE';
}