<template>
  <div class="container mx-auto p-6 max-w-4xl font-sans">
    
    <button @click="router.push('/')" class="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium">
      <span>⬅️ กลับไปหน้ารวมคอร์ส</span>
    </button>

    <div v-if="loading" class="text-center py-20 text-gray-500 text-xl">
      กำลังดึงข้อมูลวิดีโอ... 🎬
    </div>

    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-center">
      เกิดข้อผิดพลาด: {{ error }}
    </div>

    <div v-else class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-4">{{ video.title }}</h1>
      
      <div class="bg-black rounded-lg overflow-hidden aspect-video shadow-inner">
        <video 
          ref="videoPlayer" 
          controls 
          class="w-full h-full"
          @loadedmetadata="jumpToResumeTime"  @timeupdate="handleTimeUpdate"
          @seeked="handleSeeked"
          @play="handlePlay"
          @pause="handlePause"
          @ended="handleEnded"
        ></video>
      </div>
      
      <div class="mt-4 text-gray-500 text-sm flex justify-between">
        <span>Video ID: <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ video.id }}</span></span>
        <span>ความยาว: {{ video.duration || 'ไม่ระบุ' }}</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Hls from 'hls.js'; // นำเข้า hls.js ที่เพิ่งลงไป

const route = useRoute();
const router = useRouter();

const currentVideoId = route.params.id;
let isLeaving = false;

const video = ref(null);
const loading = ref(true);
const error = ref(null);
const resumeTime = ref(0);
const videoPlayer = ref(null); 
let hls = null; 


const fetchVideoData = async () => {
  try {
    // ยิง API ไปเอาข้อมูลวิดีโอเฉพาะ ID นี้
    const response = await fetch(`http://localhost:3000/video/${route.params.id}`);
    if (!response.ok) throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    video.value = data;

    loading.value = false;

    await nextTick();
    setupPlayer(data.streamUrl);

  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const fetchResumeTime = async () => {
  try {
    const response = await fetch(`http://localhost:3000/progress/resume?videoId=${currentVideoId}&userId=user-001`);
    if (response.ok) {
      const data = await response.json();
      resumeTime.value = Number(data.resumeTime) || 0;
      console.log(`ดึงเวลาที่ค้างไว้สำเร็จ: ${resumeTime.value} วินาที`);
    }
  } catch (err) {
    console.error('ไม่สามารถดึงเวลาที่ดูค้างไว้ได้', err);
  }
};

const jumpToResumeTime = () => {
  if (videoPlayer.value && resumeTime.value > 0) {
    videoPlayer.value.currentTime = resumeTime.value;
    console.log(`⏩ กรอวิดีโอไปที่เวลา ${resumeTime.value} วินาที`);
    
    // videoPlayer.value.play(); 
  }
};

const setupPlayer = (streamUrl) => {
  if (!videoPlayer.value) return;

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(streamUrl); 
    hls.attachMedia(videoPlayer.value); // ผูกเข้ากับแท็ก <video>
    
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('วิดีโอพร้อมเล่นแล้ว!');
      // videoPlayer.value.play(); // ปลดคอมเมนต์ถ้าอยากให้มันเล่นอัตโนมัติ
    });
  } 
  // 2. ถ้าเป็น Safari (Apple) มันรองรับ m3u8 ในตัวอยู่แล้ว ไม่ต้องพึ่ง hls.js
  else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.value.src = streamUrl;
  }
};

const handleTabClose = () => {
  if (videoPlayer.value) {
    sendTrackingData('LEAVE_PAGE', videoPlayer.value.currentTime);
  }
};

// ทำงานตอนเปิดหน้านี้
onMounted(async() => {
  await fetchResumeTime();
  fetchVideoData();
 window.addEventListener('beforeunload', saveResumeTimeOnLeave);
});

// ทำงานตอนปิดหน้านี้ (กดกลับ)
onBeforeUnmount(() => {
  if (videoPlayer.value) {
    sendTrackingData('LEAVE_PAGE', videoPlayer.value.currentTime);
  }

  if (hls) {
    hls.destroy(); // ล้างข้อมูลทิ้ง คืนเมมโมรี่ให้เครื่อง
  }

  window.removeEventListener('beforeunload', handleTabClose);
});


// --- เริ่มต้นส่วนระบบ Tracking ---
const lastTrackedTime = ref(0); // เก็บเวลาที่ยิง API ไปล่าสุด

// ฟังก์ชันหลักสำหรับส่งข้อมูล 
const sendTrackingData = async (eventType, currentTime) => {

  if (isLeaving) return;
  const timeInSeconds = Math.floor(currentTime);
  
  console.log(`📡 [Tracking: ${eventType}] ส่งข้อมูลไป Backend -> เวลาปัจจุบัน: ${timeInSeconds} วินาที`);
  
  try {
    const response = await fetch('http://localhost:3000/progress', {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        videoId: currentVideoId, 
        userId: 'user-001',      // Mock userId ไว้ก่อน
        eventType: eventType, 
        currentTime: timeInSeconds 
      }),
      keepalive: true 
    });

    if (!response.ok) {
      console.error('❌ ส่ง Tracking ไม่สำเร็จ');
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการส่ง Tracking:', error);
  }
};

const saveResumeTimeOnLeave = () => {
  if (isLeaving) return; 
  isLeaving = true; 

  const currentTime = videoPlayer.value ? videoPlayer.value.currentTime : 0;
  
  fetch('http://localhost:3000/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      videoId: currentVideoId, 
      userId: 'user-001', 
      eventType: 'LEAVE_PAGE', 
      currentTime: Math.floor(currentTime) 
    }),
    keepalive: true 
  });
};


// 1. ดักจับเวลาทุกๆ 5 วินาที (ขณะเล่น)
const handleTimeUpdate = (event) => {
  const currentTime = event.target.currentTime;
  if (Math.abs(currentTime - lastTrackedTime.value) >= 5) {
    sendTrackingData('INTERVAL_5_SEC', currentTime);
    lastTrackedTime.value = currentTime; // อัปเดตเวลาล่าสุดเพื่อเริ่มนับ 5 วิใหม่
  }
};

// 2. ดักจับตอน User กดกรอคลิป (ปล่อยเมาส์จากแถบเวลา)
const handleSeeked = (event) => {
  const currentTime = event.target.currentTime;
  sendTrackingData('SEEKED', currentTime);
  lastTrackedTime.value = currentTime; 
};

// 3. ดักจับตอนกด Play, Pause และตอนวิดีโอเล่นจบ
const handlePlay = (event) => sendTrackingData('PLAY', event.target.currentTime);
const handlePause = (event) => sendTrackingData('PAUSE', event.target.currentTime);
const handleEnded = (event) => sendTrackingData('ENDED', event.target.currentTime);

// 4. ดักจับตอน "เปลี่ยนหน้าเว็บ" หรือ "กดปุ่มย้อนกลับ"
onBeforeUnmount(() => {
  isLeaving = true;
});
</script>