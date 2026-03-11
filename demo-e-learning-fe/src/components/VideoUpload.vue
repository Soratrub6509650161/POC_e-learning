<template>
  <div class="container mx-auto p-6 max-w-3xl font-sans">
    
    <button @click="$router.push('/')" class="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium">
      <span>⬅️ กลับไปหน้ารวมคอร์ส</span>
    </button>

    <div class="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">อัปโหลดวิดีโอ (Direct-to-Cloud) ☁️</h1>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">เลือกไฟล์วิดีโอ (MP4)</label>
        <input 
          type="file" 
          accept="video/mp4" 
          @change="handleFileChange"
          :disabled="isUploading"
          class="block w-full text-sm text-gray-500
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-blue-50 file:text-blue-700
                 hover:file:bg-blue-100
                 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div v-if="selectedFile" class="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p><strong>ชื่อไฟล์:</strong> {{ selectedFile.name }}</p>
        <p><strong>ขนาด:</strong> {{ formatFileSize(selectedFile.size) }}</p>
      </div>

      <button 
        @click="startUpload" 
        :disabled="!selectedFile || isUploading"
        class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
      >
        <span v-if="!isUploading">🚀 เริ่มอัปโหลดวิดีโอ</span>
        <span v-else>กำลังดำเนินการ...</span>
      </button>

      <div v-if="uploadStatus" class="mt-8">
        <div class="flex justify-between text-sm font-medium mb-2" :class="statusColor">
          <span>{{ statusMessage }}</span>
          <span v-if="isUploading">{{ uploadProgress }}%</span>
        </div>
        
        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            class="h-2.5 rounded-full transition-all duration-300"
            :class="progressBarColor"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          <strong>รายละเอียดข้อผิดพลาด:</strong>
          <p class="mt-1">{{ errorMessage }}</p>
          <p class="mt-2 text-xs text-red-500">
            *หมายเหตุ: หากติด Error ฝั่ง S3 แสดงว่าโค้ดทำงานถูกต้องแล้ว แต่ต้องรอพี่ๆ ทีม Infra นำ Key ของจริงมาใส่ใน Backend ก่อนครับ
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const selectedFile = ref(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref(''); // 'requesting', 'uploading', 'success', 'error'
const errorMessage = ref('');

// จัดการสีของ Status และ Progress Bar ตาม State
const statusColor = computed(() => {
  if (uploadStatus.value === 'error') return 'text-red-600';
  if (uploadStatus.value === 'success') return 'text-green-600';
  return 'text-blue-600';
});

const progressBarColor = computed(() => {
  if (uploadStatus.value === 'error') return 'bg-red-500';
  if (uploadStatus.value === 'success') return 'bg-green-500';
  return 'bg-blue-600';
});

const statusMessage = computed(() => {
  switch (uploadStatus.value) {
    case 'requesting': return 'กำลังขอ URL สำหรับอัปโหลดจาก Backend...';
    case 'uploading': return 'กำลังส่งไฟล์ขึ้น Cloud (S3)...';
    case 'success': return 'อัปโหลดเสร็จสมบูรณ์! 🎉';
    case 'error': return 'เกิดข้อผิดพลาดในการอัปโหลด ❌';
    default: return '';
  }
});

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'video/mp4') {
    selectedFile.value = file;
    // Reset state
    uploadStatus.value = '';
    uploadProgress.value = 0;
    errorMessage.value = '';
  } else if (file) {
    alert('กรุณาเลือกไฟล์วิดีโอ .mp4 เท่านั้นครับ');
    event.target.value = '';
    selectedFile.value = null;
  }
};

const startUpload = async () => {
  if (!selectedFile.value) return;

  isUploading.value = true;
  uploadStatus.value = 'requesting';
  errorMessage.value = '';
  uploadProgress.value = 0;

  try {
    // Step 1: ขอ Presigned URL จาก Backend
    console.log('Step 1: Requesting upload URL...');
    const urlResponse = await fetch(`http://localhost:3000/video/upload-url?fileName=${encodeURIComponent(selectedFile.value.name)}`);
    const urlData = await urlResponse.json();

    if (!urlResponse.ok || urlData.error) {
      throw new Error(urlData.error || 'ไม่สามารถสร้าง Presigned URL จาก Backend ได้');
    }

    const { uploadUrl } = urlData;
    console.log('ได้รับ Presigned URL แล้วเตรียมยิงตรงขึ้น S3');

    // Step 2: อัปโหลดไฟล์ไปที่ S3 โดยตรงด้วย XMLHttpRequest (เพื่อให้แทร็ก Progress ได้)
    uploadStatus.value = 'uploading';
    await uploadToS3(uploadUrl, selectedFile.value);

    // สำเร็จ!
    uploadStatus.value = 'success';
    uploadProgress.value = 100;
    
  } catch (error) {
    console.error('Upload Error:', error);
    uploadStatus.value = 'error';
    errorMessage.value = error.message;
  } finally {
    isUploading.value = false;
  }
};

// ฟังก์ชันสำหรับยิง PUT Request ขึ้น S3 พร้อมดักจับ Progress
const uploadToS3 = (url, file) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        uploadProgress.value = percentComplete;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        // ดัก Error ฝั่ง S3 (เช่น Signature ไม่ถูกต้องเพราะใช้ Key ปลอม)
        reject(new Error(`S3 ปฏิเสธการอัปโหลด (Status: ${xhr.status}). ตรวจสอบว่าใส่ AWS Access Key ถูกต้องหรือไม่`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ S3 (Network Error)'));
    });

    xhr.open('PUT', url, true);
    // สำคัญ: ต้องเซ็ต Content-Type ให้ตรงกับที่สร้าง Presigned URL ไว้ใน Backend
    xhr.setRequestHeader('Content-Type', file.type); 
    xhr.send(file);
  });
};
</script>