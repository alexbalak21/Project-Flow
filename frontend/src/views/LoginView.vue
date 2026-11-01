<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/http';
import { useAuthStore } from '../stores/auth';
import AuthLayout from '../components/AuthLayout.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push(typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard');
  } catch (e) {
    error.value = e instanceof ApiError ? e.friendly : 'Could not reach the server';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <form class="grid gap-5" @submit.prevent="submit">
      <div>
        <h1 class="text-center text-4xl font-semibold tracking-tight">Welcome back</h1>
        <p class="mt-3 text-center text-slate-600">Log in to pick up where your team left off.</p>
      </div>
      <label class="field-label">Email<input v-model="email" type="email" required autocomplete="email" class="field-input" /></label>
      <label class="field-label">Password<input v-model="password" type="password" required autocomplete="current-password" class="field-input" /></label>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="text-right text-sm"><RouterLink to="/forgot-password" class="text-primary-500 hover:underline">Forgot password?</RouterLink></div>
      <button class="btn-primary h-12" :disabled="busy">{{ busy ? 'Logging in…' : 'Log in' }}</button>
      <p class="text-center text-sm text-slate-600">New to ProjectFlow? <RouterLink :to="{ path: '/register', query: route.query }" class="font-medium text-primary-500 hover:underline">Create a workspace</RouterLink></p>
    </form>
  </AuthLayout>
</template>
