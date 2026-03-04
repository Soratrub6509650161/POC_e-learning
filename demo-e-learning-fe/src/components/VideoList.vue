<template>
  <div class="container mx-auto p-6 font-sans">
    <h1 class="text-3xl font-bold mb-8 text-white">📚 คอร์สเรียนของฉัน</h1>

    <div v-if="loading" class="text-center text-xl text-gray-500 py-10">
      กำลังโหลดข้อมูลวิดีโอ...
    </div>

    <div v-else-if="error" class="text-center text-red-500 py-10">
      เกิดข้อผิดพลาด: {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="video in videos"
        :key="video.id"
        class="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 border border-gray-100"
        @click="goToPlayer(video.id)"
      >
        <img 
          :src="video.thumbnail" 
          :alt="video.title" 
          class="w-full h-48 object-cover"
        />
        
        <div class="p-5 space-y-3">
          <h2 class="text-lg font-semibold text-gray-800 line-clamp-2">
            {{ video.title }}
          </h2>

          <!-- แถบความคืบหน้า -->
          <div>
            <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>
                ความยาว: {{ video.duration || 'ไม่ระบุ' }}
              </span>
              <div class="flex items-center gap-1">
                <span v-if="video.progressPercent != null">
                  {{ video.progressPercent }}%
                </span>
                <span v-if="video.completed" class="inline-flex items-center text-green-600 text-xs font-semibold">
                  ✔ ดูจบแล้ว
                </span>
              </div>
            </div>
            <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 transition-all duration-500"
                :style="{ width: (video.progressPercent || 0) + '%' }"
              ></div>
            </div>
          </div>

          <div class="flex justify-end">
            <button class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
              ดูวิดีโอ
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const videos = ref([]);
const loading = ref(true);
const error = ref(null);

const MOCK_USER_ID = 'user-001';

const parseDurationToSeconds = (duration) => {
  if (!duration || typeof duration !== 'string') return null;
  const parts = duration.split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  }
  return null;
};

const fetchProgressForVideo = async (video) => {
  try {
    const resp = await fetch(
      `http://localhost:3000/progress/resume?videoId=${video.id}&userId=${MOCK_USER_ID}`,
    );
    if (!resp.ok) return;
    const data = await resp.json();
    const resumeTime = Number(data.resumeTime) || 0;
    const durationSeconds = parseDurationToSeconds(video.duration);

    video.resumeTime = resumeTime;

    if (durationSeconds && durationSeconds > 0) {
      const percent = Math.min(100, Math.round((resumeTime / durationSeconds) * 100));
      video.progressPercent = percent;
      video.completed = percent >= 90;
    } else {
      video.progressPercent = null;
      video.completed = false;
    }
  } catch (e) {
    // ใน POC ถ้า error ให้ข้ามไปเฉยๆ
  }
};

const fetchVideos = async () => {
  try {
    const response = await fetch('http://localhost:3000/video/list');
    if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อ Backend ได้');
    
    const data = await response.json();
    videos.value = data;

    // ดึง progress สำหรับแต่ละวิดีโอแบบ mock
    await Promise.all(videos.value.map((v) => fetchProgressForVideo(v)));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};


const goToPlayer = (videoId) => {
  router.push(`/video/${videoId}`);
  console.log('เตรียมไปหน้า Player ของ ID:', videoId);
};


onMounted(() => {
  fetchVideos();
});
</script>