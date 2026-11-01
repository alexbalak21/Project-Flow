<script setup>
import { ref } from 'vue';
import { api, ApiError } from '../api/http';
import AuthLayout from '../components/AuthLayout.vue';

const email = ref('');
const sent = ref(false);
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await api('/auth/forgot-password', { method: 'POST', body: { email: email.value }, auth: false });
    sent.value = true;
  } catch (e) {
    error.value = e instanceof ApiError ? e.friendly : 'Could not reach the server';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <div v-if="sent" class="grid gap-4 text-center">
      <h1 class="text-3xl font-semibold tracking-tight">Check your email</h1>
      <p class="text-slate-600">If an account exists for {{ email }}, a reset link is on its way. It works for one hour.</p>
      <RouterLink to="/login" class="font-medium text-primary-500 hover:underline">Back to log in</RouterLink>
    </div>
    <form v-else class="grid gap-5" @submit.prevent="submit">
      <div>
        <h1 class="text-center text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p class="mt-3 text-center text-slate-600">Enter your email and we will send you a reset link.</p>
      </div>
      <label class="field-label">Email<input v-model="email" type="email" required class="field-input" /></label>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <button class="btn-primary h-12" :disabled="busy">{{ busy ? 'Sending…' : 'Send reset link' }}</button>
      <RouterLink to="/login" class="text-center text-sm font-medium text-primary-500 hover:underline">Back to log in</RouterLink>
    </form>
  </AuthLayout>
</template>
