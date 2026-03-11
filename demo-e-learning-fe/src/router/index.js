import { createRouter, createWebHistory } from 'vue-router';
import VideoList from '../components/VideoList.vue';
import VideoUpload from '../components/VideoUpload.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: VideoList
  },
  {
    path: '/video/:id', 
    name: 'Player',

    component: () => import('../components/VideoPlayer.vue') 
  },
  {
    path: '/upload',
    name: 'VideoUpload',
    component: VideoUpload
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;