import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const ComingSoon = () => import('../views/ComingSoonView.vue');

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: ComingSoon, meta: { shell: true, title: 'Dashboard', note: 'Metrics and charts arrive with the task system.' } },
  { path: '/projects', component: ComingSoon, meta: { shell: true, title: 'Projects', note: 'Project management is the next milestone.' } },
  { path: '/board', component: ComingSoon, meta: { shell: true, title: 'Board', note: 'The drag-and-drop Kanban board follows projects.' } },
  { path: '/team', component: () => import('../views/TeamView.vue'), meta: { shell: true, title: 'Team' } },

  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('../views/RegisterView.vue'), meta: { guest: true } },
  { path: '/forgot-password', component: () => import('../views/ForgotPasswordView.vue'), meta: { guest: true } },
  { path: '/reset-password', component: () => import('../views/ResetPasswordView.vue'), meta: { guest: true } },

  // Reachable whether or not you are logged in.
  { path: '/verify-email', component: () => import('../views/TokenActionView.vue'), meta: { public: true, action: 'verify' } },
  // Needs a session; the guard sends you to /login and back.
  { path: '/invite', component: () => import('../views/TokenActionView.vue'), meta: { action: 'invite' } },

  { path: '/:pathMatch(.*)*', component: ComingSoon, meta: { shell: true, title: 'Page not found', note: 'That page does not exist.' } },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();
  if (to.meta.guest && auth.user) return '/dashboard';
  if (!to.meta.guest && !to.meta.public && !auth.user) return { path: '/login', query: { redirect: to.fullPath } };
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ProjectFlow` : 'ProjectFlow';
});
