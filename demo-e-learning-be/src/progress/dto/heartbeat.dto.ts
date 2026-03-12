// DTO สำหรับรับ Payload จาก POST /progress/heartbeat
// แต่ละ Heartbeat แทนช่วงเวลาที่ผู้เรียนกำลังดูวิดีโออยู่
export class HeartbeatDto {
  // รหัสผู้เรียน
  userId: string;

  // รหัสวิดีโอที่กำลังดู
  videoId: string;

  // เวลาเริ่มต้นของ Heartbeat interval (หน่วย: วินาที)
  from: number;

  // เวลาสิ้นสุดของ Heartbeat interval (หน่วย: วินาที)
  to: number;

  // ตำแหน่ง Playhead ปัจจุบัน ณ ขณะที่ส่ง Heartbeat (หน่วย: วินาที)
  currentTime: number;
}
