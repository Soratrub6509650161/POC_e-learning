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

    <div v-else>
      <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">{{ video.title }}</h1>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <!-- คอลัมน์ฝั่งวิดีโอ -->
          <div class="flex flex-col h-full">
            <div class="bg-black rounded-lg overflow-hidden aspect-video shadow-inner relative group">
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

              <!-- Quality Selector -->
              <div v-if="videoQualities.length > 0" class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div class="relative">
                  <button
                    @click="showQualityMenu = !showQualityMenu"
                    class="bg-black bg-opacity-70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-1.5 border border-white border-opacity-20"
                  >
                    <span>⚙️</span>
                    <span>{{ videoQualities.find(q => q.index === currentQuality)?.label || 'Auto' }}</span>
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="showQualityMenu"
                    class="absolute right-0 top-full mt-1 bg-gray-900 bg-opacity-95 rounded-lg shadow-xl border border-white border-opacity-10 overflow-hidden min-w-[100px]"
                  >
                    <button
                      v-for="q in videoQualities"
                      :key="q.index"
                      @click="changeQuality(q.index)"
                      class="w-full text-left text-xs px-4 py-2 transition-colors"
                      :class="currentQuality === q.index ? 'bg-blue-600 text-white font-bold' : 'text-gray-200 hover:bg-white hover:bg-opacity-10'"
                    >
                      {{ q.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- เครื่องมือสำหรับผู้สอน แสดงเฉพาะเมื่อเปิดโหมดซิงค์ -->
            <div v-if="isSyncEnabled" class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 class="font-bold text-blue-800 mb-2">🛠️ ตั้งค่าสไลด์สำหรับซิงค์กับวิดีโอ</h3>
              <div class="flex items-center gap-4 mb-3">
                <input
                  type="file"
                  @change="handleFileUpload"
                  accept="application/pdf"
                  class="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <span v-if="isUploading" class="text-blue-600 animate-pulse text-sm">กำลังประมวลผล PDF...</span>
              </div>
              <p class="text-xs text-gray-600">
                อัปโหลดไฟล์สไลด์แบบ PDF เพื่อแปลงเป็นภาพ แล้วใช้ปุ่ม Mark ในรายการสไลด์ด้านขวาเพื่อกำหนดเวลาให้แต่ละหน้า
              </p>
            </div>
          </div>

          <!-- คอลัมน์ฝั่งสไลด์ -->
          <div class="flex flex-col h-full">
            <div class="rounded-xl border border-gray-100 h-full flex flex-col">

              <div v-if="displaySlide" class="border-2 border-blue-500 rounded-lg overflow-hidden shadow-md mb-4 relative aspect-video group">
                <Transition name="slide-fade" mode="out-in">
                  <img :key="displaySlide.slideNumber" :src="displaySlide.imageUrl" class="w-full h-full object-contain bg-gray-50" />
                </Transition>

                <!-- Slide Number Badge -->
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white flex justify-center items-center py-2 px-3 text-xs font-semibold pointer-events-none">
                  <span>สไลด์หน้าที่ {{ displaySlide.slideNumber }} / {{ slides.length }}</span>
                </div>

                <!-- Prev Arrow Button -->
                <button
                  v-show="!isAtFirstSlide"
                  @click="goToPrevSlide"
                  class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/75 text-white rounded-full w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm"
                  title="สไลด์ก่อนหน้า"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <!-- Next Arrow Button -->
                <button
                  v-show="!isAtLastSlide"
                  @click="goToNextSlide"
                  class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/75 text-white rounded-full w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm"
                  title="สไลด์ถัดไป"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <!-- Sync Slide with Video Button (แสดงเฉพาะโหมด Manual) -->
                <Transition name="fade-up">
                  <div v-if="selectedSlideNumber !== null" class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <button
                      @click="clearSelection"
                      class="flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-xl transition-all duration-200 whitespace-nowrap backdrop-blur-sm border border-white/20 hover:scale-105 active:scale-95"
                    >
                      🔄 Sync slide with video
                    </button>
                  </div>
                </Transition>
              </div>

              <div class="flex items-center justify-between mb-3">
                <!-- ปุ่มโหมดซิงค์สำหรับควบคุมพฤติกรรมสไลด์ -->
                <button
                  @click="toggleSyncMode"
                  class="ml-auto text-xs px-2 py-1 rounded-full border flex items-center gap-1"
                  :class="isSyncEnabled ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'"
                >
                  <span class="w-2 h-2 rounded-full" :class="isSyncEnabled ? 'bg-green-500' : 'bg-gray-400'"></span>
                  <span>{{ isSyncEnabled ? 'Sync On' : 'Sync Off' }}</span>
                </button>
              </div>

              <!-- โหมดตั้งค่าแสดงรายการสไลด์ + ปุ่ม Mark/บันทึก เฉพาะเมื่อเปิดซิงค์ -->
              <div v-if="isSyncEnabled">
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
                    <button
                      @click.stop="markSlideTime(slide)"
                      class="bg-blue-100 text-blue-700 p-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors"
                      title="บันทึกเวลาปัจจุบันของวิดีโอลงสไลด์นี้"
                    >
                      📍 Mark
                    </button>
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

// --- Quality Selector ---
const videoQualities = ref([]);
const currentQuality = ref(-1);
const showQualityMenu = ref(false);

// --- ส่วนของ Slide Sync Data ---
const slides = ref([]);
const currentTimeValue = ref(0);
const isUploading = ref(false);
const isSyncEnabled = ref(false);

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
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      const levels = data.levels
        .map((level, index) => ({
          index,
          label: `${level.height}p`,
          height: level.height,
        }))
        .sort((a, b) => b.height - a.height);
      videoQualities.value = [{ index: -1, label: 'Auto', height: Infinity }, ...levels];
      currentQuality.value = -1;
    });
  } else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.value.src = streamUrl;
  }
};

const changeQuality = (levelIndex) => {
  if (!hls) return;
  hls.currentLevel = levelIndex;
  currentQuality.value = levelIndex;
  showQualityMenu.value = false;
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

// หน้าที่ควรจะแสดงตามเวลาวิดีโอ (Auto Sync ตลอดเวลา)
const autoSyncSlide = computed(() => {
  if (slides.value.length === 0) return null;
  const pastSlides = slides.value
    .filter(s => s.showAtTime <= currentTimeValue.value)
    .sort((a, b) => b.showAtTime - a.showAtTime);
  return pastSlides[0] || slides.value[0];
});

// หน้าที่จะแสดงบนจอใหญ่จริงๆ (ถ้ามี selected ให้แสดง selected ถ้าไม่มีให้แสดง auto)
const displaySlide = computed(() => {
  if (!slides.value || slides.value.length === 0) {
    return null;
  }

  if (selectedSlideNumber.value) {
    const selected = slides.value.find(s => s.slideNumber === selectedSlideNumber.value);
    if (selected) return selected;
  }

  return autoSyncSlide.value || slides.value[0];
});

// ฟังก์ชันเมื่อคลิกที่แถบสไลด์เพื่อพรีวิว
const selectSlide = (slide) => {
  selectedSlideNumber.value = slide.slideNumber;
};

// ฟังก์ชันยกเลิกพรีวิว กลับสู่โหมดออโต้
const clearSelection = () => {
  selectedSlideNumber.value = null;
};

// ฟังก์ชันเลื่อนสไลด์ไปหน้าถัดไป (เข้าสู่โหมด Manual ทันที)
const goToNextSlide = () => {
  if (!slides.value.length || !displaySlide.value) return;
  const currentIndex = slides.value.findIndex(s => s.slideNumber === displaySlide.value.slideNumber);
  const nextIndex = Math.min(currentIndex + 1, slides.value.length - 1);
  selectedSlideNumber.value = slides.value[nextIndex].slideNumber;
};

// ฟังก์ชันเลื่อนสไลด์ไปหน้าก่อนหน้า (เข้าสู่โหมด Manual ทันที)
const goToPrevSlide = () => {
  if (!slides.value.length || !displaySlide.value) return;
  const currentIndex = slides.value.findIndex(s => s.slideNumber === displaySlide.value.slideNumber);
  const prevIndex = Math.max(currentIndex - 1, 0);
  selectedSlideNumber.value = slides.value[prevIndex].slideNumber;
};

// คำนวณว่าอยู่ที่สไลด์แรกหรือสไลด์สุดท้ายหรือไม่ (เพื่อซ่อนปุ่ม Prev/Next ที่ขอบ)
const isAtFirstSlide = computed(() => {
  if (!slides.value.length || !displaySlide.value) return true;
  return slides.value[0].slideNumber === displaySlide.value.slideNumber;
});

const isAtLastSlide = computed(() => {
  if (!slides.value.length || !displaySlide.value) return true;
  return slides.value[slides.value.length - 1].slideNumber === displaySlide.value.slideNumber;
});

// ฟังก์ชันบันทึกเวลา (กด Mark ซ้ำจะเขียนทับเวลาเดิมได้)
const markSlideTime = (slide) => {
  if (videoPlayer.value) {
    slide.showAtTime = Math.floor(videoPlayer.value.currentTime);
    slides.value.sort((a, b) => a.showAtTime - b.showAtTime);
    selectedSlideNumber.value = null;
  }
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

const toggleSyncMode = async () => {
  isSyncEnabled.value = !isSyncEnabled.value;

  // ถ้ากดเปิดโหมดซิงค์ แต่ยังไม่มีสไลด์ใน state ให้ลองดึงจาก backend อีกรอบ
  if (isSyncEnabled.value && slides.value.length === 0) {
    await fetchSlides();
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

// --- 4. ระบบ Tracking ---
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
  if (videoPlayer.value) {
    // ส่ง LEAVE_PAGE ก่อน เพื่อให้ backend บันทึก resume time
    sendTrackingData('LEAVE_PAGE', videoPlayer.value.currentTime);
  }
  isLeaving = true;
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

/* Slide transition */
.slide-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Sync button fade-up transition */
.fade-up-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-up-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
