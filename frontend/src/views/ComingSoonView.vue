<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <section class="rounded-3xl border border-slate-100 bg-white p-10 shadow-sm">
    <h2 class="text-xl font-semibold">{{ route.meta.title }}</h2>
    <p class="mt-2 max-w-prose text-slate-500">{{ route.meta.note }}</p>
    <RouterLink to="/team" class="mt-6 inline-block font-medium text-primary-500 hover:underline">Go to Team</RouterLink>
  </section>
</template>
