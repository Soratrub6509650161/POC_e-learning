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
        
        <div class="p-5">
          <h2 class="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
            {{ video.title }}
          </h2>
          <div class="flex justify-between items-center text-sm text-gray-500">
            <span>ความยาว: {{ video.duration || 'ไม่ระบุ' }}</span>
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


const fetchVideos = async () => {
  try {
    
    const response = await fetch('http://localhost:3000/video/list');
    
    if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อ Backend ได้');
    
    const data = await response.json();
    videos.value = data; 
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