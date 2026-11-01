<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/http';
import { useAuthStore } from '../stores/auth';
import AuthLayout from '../components/AuthLayout.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const form = reactive({ firstName: '', lastName: '', email: '', password: '', workspaceName: '' });
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.register({ ...form, workspaceName: form.workspaceName || undefined });
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
        <h1 class="text-center text-4xl font-semibold tracking-tight">Create your workspace</h1>
        <p class="mt-3 text-center text-slate-600">Free for up to 5 people and 3 projects.</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <label class="field-label">First name<input v-model="form.firstName" required autocomplete="given-name" class="field-input" /></label>
        <label class="field-label">Last name<input v-model="form.lastName" required autocomplete="family-name" class="field-input" /></label>
      </div>
      <label class="field-label">Email<input v-model="form.email" type="email" required autocomplete="email" class="field-input" /></label>
      <label class="field-label">Password<input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" class="field-input" /></label>
      <label class="field-label">Workspace name <span class="font-normal text-slate-400">(optional)</span><input v-model="form.workspaceName" class="field-input" placeholder="Acme Studio" /></label>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <button class="btn-primary h-12" :disabled="busy">{{ busy ? 'Creating…' : 'Create workspace' }}</button>
      <p class="text-center text-sm text-slate-600">Already have an account? <RouterLink :to="{ path: '/login', query: route.query }" class="font-medium text-primary-500 hover:underline">Log in</RouterLink></p>
    </form>
  </AuthLayout>
</template>
