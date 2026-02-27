import { createRouter, createWebHistory } from 'vue-router';
import VideoList from '../components/VideoList.vue';

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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;