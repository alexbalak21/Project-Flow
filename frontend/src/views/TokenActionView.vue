<script setup>
// Handles two link-based flows: /verify-email?token=… and /invite?token=…
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, ApiError } from '../api/http';
import { useAuthStore } from '../stores/auth';
import AuthLayout from '../components/AuthLayout.vue';

const route = useRoute();
const auth = useAuthStore();
const state = ref('working');
const message = ref('');
const isInvite = route.meta.action === 'invite';

onMounted(async () => {
  try {
    const token = route.query.token;
    if (isInvite) {
      const { workspaceId } = await api('/invitations/accept', { method: 'POST', body: { token } });
      await auth.reloadMe();
      auth.selectWorkspace(workspaceId);
    } else {
      await api('/auth/verify-email', { method: 'POST', body: { token }, auth: false });
    }
    state.value = 'done';
  } catch (e) {
    state.value = 'error';
    message.value = e instanceof ApiError ? e.friendly : 'Could not reach the server';
  }
});
</script>

<template>
  <AuthLayout>
    <div class="grid gap-4 text-center">
      <h1 class="text-3xl font-semibold tracking-tight">
        {{ state === 'working' ? 'One moment…' : state === 'error' ? 'That did not work' : isInvite ? 'You have joined the workspace' : 'Email verified' }}
      </h1>
      <p v-if="state === 'error'" class="text-red-600">{{ message }}</p>
      <RouterLink :to="auth.user ? '/dashboard' : '/login'" class="font-medium text-primary-500 hover:underline">{{ auth.user ? 'Go to dashboard' : 'Go to log in' }}</RouterLink>
    </div>
  </AuthLayout>
</template>
