<template>
  <div class="container mx-auto p-6 max-w-6xl font-sans">
    
    <button @click="router.push('/')" class="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium">
      <span>⬅️ กลับไปหน้ารวมคอร์ส</span>
    </button>

    <div v-if="loading" class="text-center py-20 text-gray-500 text-xl">
      กำลังดึงข้อมูลวิดีโอ... 🎬
    </div>

    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-center">
      เกิดข้อผิดพลาด: {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <div class="lg:col-span-8 bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">{{ video.title }}</h1>
        
        <div class="bg-black rounded-lg overflow-hidden aspect-video shadow-inner">
          <video 
            ref="videoPlayer" 
            controls 
            class="w-full h-full"
            @loadedmetadata="jumpToResumeTime"  
            @timeupdate="onTimeUpdateWrapper"
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

        <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 class="font-bold text-blue-800 mb-2">🛠️ สำหรับผู้สอน: จัดการสไลด์</h3>
          <div class="flex items-center gap-4">
            <input type="file" @change="handleFileUpload" accept="application/pdf" class="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
            <span v-if="isUploading" class="text-blue-600 animate-pulse">กำลังประมวลผล PDF...</span>
          </div>
        </div>
      </div>

      <div class="lg:col-span-4 space-y-4">
        <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100 sticky top-6">
          <h2 class="text-lg font-bold text-gray-800 mb-4">🖼️ สไลด์ประกอบการเรียน</h2>
          
          <div v-if="displaySlide" class="border-2 border-blue-500 rounded-lg overflow-hidden shadow-md mb-4 relative">
            <img :src="displaySlide.imageUrl" class="w-full object-contain bg-gray-50" />
            
            <div class="bg-blue-600 text-white flex justify-between items-center py-1.5 px-3 text-sm font-bold">
              <span>สไลด์หน้าที่ {{ displaySlide.slideNumber }}</span>
              <span v-if="selectedSlideNumber" class="bg-yellow-400 text-yellow-900 px-2 rounded text-xs shadow-sm">กำลังพรีวิว 👀</span>
              <span v-else class="bg-green-400 text-green-900 px-2 rounded text-xs shadow-sm">กำลังซิงค์ 🟢</span>
            </div>

            <button v-if="selectedSlideNumber" @click="clearSelection" class="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white text-xs px-2 py-1 rounded hover:bg-opacity-100 transition">
              ✖ กลับโหมดซิงค์ปกติ
            </button>
          </div>

          <div class="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            <div
              v-for="slide in slides"
              :key="slide.slideNumber"
              @click="selectSlide(slide)"
              :class="[
                'p-2 rounded border flex items-center gap-3 transition-all cursor-pointer hover:shadow-md',
                displaySlide?.slideNumber === slide.slideNumber
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:bg-gray-50',
              ]"
            >
              <img :src="slide.imageUrl" class="w-16 h-10 object-cover rounded border" />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-700">หน้า {{ slide.slideNumber }}</p>
                <p class="text-sm font-mono text-gray-500">{{ formatTime(slide.showAtTime) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click.stop="markSlideTime(slide)"
                  class="bg-blue-100 text-blue-700 p-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors"
                  title="บันทึกเวลาปัจจุบันของวิดีโอลงสไลด์นี้"
                >
                  📍 Mark
                </button>
                <button
                  @click.stop="deleteSlide(slide)"
                  class="bg-red-100 text-red-700 p-1.5 rounded hover:bg-red-600 hover:text-white transition-colors"
                  title="ลบสไลด์หน้านี้ออกจากการซิงค์"
                >
                  🗑
                </button>
              </div>
            </div>
            <div v-if="slides.length === 0" class="text-center py-10 text-gray-400 text-sm">
              ยังไม่มีสไลด์ อัปโหลด PDF เพื่อเริ่มใช้งาน
            </div>
          </div>
          
          <div v-if="slides.length > 0" class="mt-4 space-y-2">
            <button
              @click="saveSlideConfig"
              class="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-md"
            >
              บันทึกการตั้งค่าทั้งหมด
            </button>
            <button
              @click="deleteAllSlides"
              class="w-full bg-red-100 text-red-700 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors shadow-sm"
            >
              ลบสไลด์ทั้งหมดสำหรับวิดีโอนี้
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Hls from 'hls.js';

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

// --- ส่วนของ Slide Sync Data ---
const slides = ref([]); 
const currentTimeValue = ref(0);
const isUploading = ref(false);

// --- 1. การดึงข้อมูลวิดีโอและระบบ Resume ---
const fetchVideoData = async () => {
  try {
    const response = await fetch(`http://localhost:3000/video/${currentVideoId}`);
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
    }
  } catch (err) {
    console.error('ไม่สามารถดึงเวลาที่ดูค้างไว้ได้', err);
  }
};

const jumpToResumeTime = () => {
  if (videoPlayer.value && resumeTime.value > 0) {
    videoPlayer.value.currentTime = resumeTime.value;
  }
};

const setupPlayer = (streamUrl) => {
  if (!videoPlayer.value) return;
  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(streamUrl); 
    hls.attachMedia(videoPlayer.value);
  } else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.value.src = streamUrl;
  }
};

// --- 2. การจัดการไฟล์ PDF ---
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  isUploading.value = true;
  try {
    const response = await fetch(`http://localhost:3000/video/${currentVideoId}/slides/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (data.slides) {
      slides.value = data.slides;
      alert('อัปโหลดและแปลงสไลด์สำเร็จ!');
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการอัปโหลด');
  } finally {
    isUploading.value = false;
  }
};

// --- 3. ระบบซิงค์เวลาและสไลด์ (โหมดพรีวิว + ออโต้) ---
const selectedSlideNumber = ref(null); // ตัวแปรเก็บหน้าที่เราคลิกเพื่อพรีวิว

// หน้าที่ควรจะแสดงตามเวลาวิดีโอ (Auto Sync)
const autoSyncSlide = computed(() => {
  if (slides.value.length === 0) return null;
  const pastSlides = slides.value
    .filter(s => s.showAtTime <= currentTimeValue.value)
    .sort((a, b) => b.showAtTime - a.showAtTime);
  return pastSlides[0] || slides.value[0];
});

// หน้าที่จะแสดงบนจอใหญ่จริงๆ (ถ้ามี selected ให้แสดง selected ถ้าไม่มีให้แสดง auto)
const displaySlide = computed(() => {
  if (selectedSlideNumber.value) {
    return slides.value.find(s => s.slideNumber === selectedSlideNumber.value) || autoSyncSlide.value;
  }
  return autoSyncSlide.value;
});

// ฟังก์ชันเมื่อคลิกที่แถบสไลด์เพื่อพรีวิว
const selectSlide = (slide) => {
  selectedSlideNumber.value = slide.slideNumber;
};

// ฟังก์ชันยกเลิกพรีวิว กลับสู่โหมดออโต้
const clearSelection = () => {
  selectedSlideNumber.value = null;
};

// ฟังก์ชันบันทึกเวลา
const markSlideTime = (slide) => {
  if (videoPlayer.value) {
    slide.showAtTime = Math.floor(videoPlayer.value.currentTime);
    slides.value.sort((a, b) => a.showAtTime - b.showAtTime);
    
    // พอบันทึกเสร็จ ให้ล้างค่า Preview ทิ้ง เพื่อให้จอใหญ่กลับไปดูแบบ Auto Sync
    selectedSlideNumber.value = null;
  }
};

const deleteSlide = async (slide) => {
  const confirmDelete = window.confirm(`ยืนยันลบสไลด์หน้าที่ ${slide.slideNumber} ออกจากการซิงค์หรือไม่?`);
  if (!confirmDelete) return;

  slides.value = slides.value.filter((s) => s.slideNumber !== slide.slideNumber);

  // ถ้าสไลด์ที่ลบเป็นสไลด์ที่กำลังพรีวิวอยู่ ให้เคลียร์ selection ทิ้ง
  if (selectedSlideNumber.value === slide.slideNumber) {
    selectedSlideNumber.value = null;
  }

  // บันทึก config ใหม่กลับไปที่ backend ทันที
  await saveSlideConfig();
};

const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const saveSlideConfig = async () => {
  try {
    const response = await fetch(`http://localhost:3000/video/${currentVideoId}/slides/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slides.value }),
    });

    if (!response.ok) {
      throw new Error('Failed to save slides config');
    }

    await response.json();
    alert('บันทึกการตั้งค่าสไลด์เรียบร้อยแล้ว');
  } catch (err) {
    console.error('Error saving slides config:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าสไลด์');
  }
};

const fetchSlides = async () => {
  try {
    const response = await fetch(`http://localhost:3000/video/${currentVideoId}/slides`);
    if (!response.ok) return;

    const data = await response.json();
    if (Array.isArray(data.slides)) {
      slides.value = data.slides;
    } else if (Array.isArray(data)) {
      slides.value = data;
    }
  } catch (err) {
    console.error('ไม่สามารถดึงข้อมูลสไลด์ได้', err);
  }
};

const deleteAllSlides = async () => {
  const confirmDelete = window.confirm(
    'ยืนยันลบสไลด์ทั้งหมดที่ซิงค์กับวิดีโอนี้หรือไม่? การลบนี้จะลบทั้งการซิงค์และไฟล์รูปสไลด์ในเครื่อง',
  );
  if (!confirmDelete) return;

  try {
    const response = await fetch(`http://localhost:3000/video/${currentVideoId}/slides/delete`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to delete slides');
    }

    slides.value = [];
    selectedSlideNumber.value = null;
    alert('ลบสไลด์ทั้งหมดสำหรับวิดีโอนี้เรียบร้อยแล้ว');
  } catch (err) {
    console.error('Error deleting all slides:', err);
    alert('เกิดข้อผิดพลาดในการลบสไลด์ทั้งหมด');
  }
};

// --- 4. ระบบ Tracking (ของเดิม) ---
const lastTrackedTime = ref(0);

const onTimeUpdateWrapper = (event) => {
  const time = event.target.currentTime;
  currentTimeValue.value = time; // อัปเดตเวลาให้สไลด์
  handleTimeUpdate(event);       // ส่ง Tracking 5 วินาที
};

const handleTimeUpdate = (event) => {
  const currentTime = event.target.currentTime;
  if (Math.abs(currentTime - lastTrackedTime.value) >= 5) {
    sendTrackingData('INTERVAL_5_SEC', currentTime);
    lastTrackedTime.value = currentTime;
  }
};

const sendTrackingData = async (eventType, currentTime) => {
  if (isLeaving) return;
  const timeInSeconds = Math.floor(currentTime);
  try {
    await fetch('http://localhost:3000/progress', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        videoId: currentVideoId, 
        userId: 'user-001',
        eventType: eventType, 
        currentTime: timeInSeconds 
      }),
      keepalive: true 
    });
  } catch (error) {
    console.error('❌ Tracking Error:', error);
  }
};

const handleSeeked = (event) => {
  sendTrackingData('SEEKED', event.target.currentTime);
  lastTrackedTime.value = event.target.currentTime; 
};

const handlePlay = (event) => sendTrackingData('PLAY', event.target.currentTime);
const handlePause = (event) => sendTrackingData('PAUSE', event.target.currentTime);
const handleEnded = (event) => sendTrackingData('ENDED', event.target.currentTime);

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

onMounted(async () => {
  await fetchResumeTime();
  await fetchVideoData();
  await fetchSlides();
  window.addEventListener('beforeunload', saveResumeTimeOnLeave);
});

onBeforeUnmount(() => {
  isLeaving = true;
  if (videoPlayer.value) {
    sendTrackingData('LEAVE_PAGE', videoPlayer.value.currentTime);
  }
  if (hls) hls.destroy();
  window.removeEventListener('beforeunload', saveResumeTimeOnLeave);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>