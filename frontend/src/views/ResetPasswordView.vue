<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, ApiError } from '../api/http';
import AuthLayout from '../components/AuthLayout.vue';

const route = useRoute();
const router = useRouter();
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await api('/auth/reset-password', { method: 'POST', body: { token: route.query.token, password: password.value }, auth: false });
    router.push('/login');
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
      <h1 class="text-center text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <label class="field-label">New password<input v-model="password" type="password" required minlength="8" autocomplete="new-password" class="field-input" /></label>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <button class="btn-primary h-12" :disabled="busy">{{ busy ? 'Saving…' : 'Save password' }}</button>
    </form>
  </AuthLayout>
</template>
