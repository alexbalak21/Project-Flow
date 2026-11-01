<script setup>
import { computed } from 'vue';

const props = defineProps({ name: { type: String, required: true }, size: { type: Number, default: 10 } });
const COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#db2777', '#ea580c', '#0891b2'];
const initials = computed(() => props.name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase());
const color = computed(() => COLORS[props.name.charCodeAt(0) % COLORS.length]);
const px = computed(() => `${props.size * 4}px`);
</script>

<template>
  <span
    :title="name"
    class="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
    :style="{ background: color, width: px, height: px }"
  >{{ initials }}</span>
</template>
