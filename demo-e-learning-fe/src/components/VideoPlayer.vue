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
          poster="https://placehold.co/1920x1080?text=Loading+Video..."
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

const video = ref(null);
const loading = ref(true);
const error = ref(null);
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

    await nextTick();
    setupPlayer(data.streamUrl);

  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
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

// ทำงานตอนเปิดหน้านี้
onMounted(() => {
  fetchVideoData();
});

// ทำงานตอนปิดหน้านี้ (กดกลับ)
onBeforeUnmount(() => {
  if (hls) {
    hls.destroy(); // ล้างข้อมูลทิ้ง คืนเมมโมรี่ให้เครื่อง
  }
});
</script>