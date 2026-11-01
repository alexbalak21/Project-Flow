<script setup>
defineProps({ color: { type: String, default: '#64748b' } });
</script>

<template>
  <span class="rounded-lg px-3 py-1 text-xs font-semibold" :style="{ background: `${color}20`, color }"><slot /></span>
</template>
