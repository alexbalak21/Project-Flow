<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from './components/AppShell.vue';

const route = useRoute();
const shell = computed(() => route.meta.shell === true);
</script>

<template>
  <AppShell v-if="shell"><RouterView /></AppShell>
  <RouterView v-else />
</template>
