<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Avatar from './Avatar.vue';
import Chip from './Chip.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/board', label: 'Board' },
  { to: '/team', label: 'Team' },
];
const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', MEMBER: 'Member' };
const fullName = () => `${auth.user.firstName} ${auth.user.lastName}`;

async function logout() {
  await auth.logout();
  router.push('/login');
}

const close = () => { menuOpen.value = false; };
onMounted(() => document.addEventListener('click', close));
onBeforeUnmount(() => document.removeEventListener('click', close));
</script>

<template>
  <header class="flex h-20 items-center justify-between gap-4 border-b-2 border-zinc-100 bg-white px-6 lg:px-12">
    <div class="flex items-center gap-4">
      <span class="text-xl font-semibold text-primary-500">ProjectFlow</span>
      <span class="hidden text-zinc-300 sm:inline">/</span>
      <h1 class="hidden text-2xl font-semibold tracking-tight sm:block">{{ route.meta.title }}</h1>
    </div>
    <div class="relative">
      <button class="flex items-center gap-2 rounded-full p-1 hover:bg-zinc-100" aria-label="Account menu" @click.stop="menuOpen = !menuOpen">
        <Avatar :name="fullName()" :size="10" />
      </button>
      <div v-if="menuOpen" class="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-lg border border-zinc-100 bg-white shadow-lg" @click.stop>
        <div class="border-b border-zinc-100 px-4 py-3">
          <p class="text-sm font-semibold">{{ fullName() }}</p>
          <p class="truncate text-xs text-slate-500">{{ auth.user.email }}</p>
        </div>
        <button class="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50" @click="logout">Log out</button>
      </div>
    </div>
  </header>

  <div class="flex">
    <aside class="hidden min-h-[calc(100vh-80px)] w-64 shrink-0 flex-col border-r-2 border-zinc-100 bg-white py-6 lg:flex">
      <div class="mx-4 mb-5 rounded-lg border border-zinc-100 bg-[#f5f5f7] px-4 py-2.5">
        <p class="text-xs text-slate-500">Workspace</p>
        <select
          v-if="auth.workspaces.length > 1"
          :value="auth.workspaceId"
          class="-ml-1 w-full bg-transparent text-sm font-semibold outline-none"
          @change="auth.selectWorkspace($event.target.value)"
        >
          <option v-for="w in auth.workspaces" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
        <p v-else class="text-sm font-semibold">{{ auth.workspace?.name }}</p>
        <div class="mt-1.5"><Chip color="#7c3aed">{{ ROLE_LABEL[auth.role] }}</Chip></div>
      </div>
      <nav class="grid gap-2">
        <RouterLink
          v-for="item in nav" :key="item.to" :to="item.to"
          class="relative flex items-center rounded-sm px-5 py-3.5 font-medium text-[#151515] hover:bg-[#e9edf6]"
          active-class="!bg-[#e4eaf5] !text-[#32589f] before:absolute before:right-0 before:top-0 before:h-full before:w-1 before:bg-[#2f6de5]"
        >{{ item.label }}</RouterLink>
      </nav>
    </aside>

    <div class="min-w-0 flex-1">
      <nav class="flex gap-1 overflow-x-auto border-b border-zinc-100 bg-white px-4 py-2 lg:hidden">
        <RouterLink
          v-for="item in nav" :key="item.to" :to="item.to"
          class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600"
          active-class="!bg-primary-50 !text-primary-500"
        >{{ item.label }}</RouterLink>
      </nav>
      <main class="p-6 lg:p-8"><slot /></main>
    </div>
  </div>
</template>
