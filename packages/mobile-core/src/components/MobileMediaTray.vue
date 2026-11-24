<script setup lang="ts">
defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
defineProps<{ horizontal?: boolean; scrolling?: boolean }>()
</script>

<template>
  <scroll-view v-if="horizontal" class="mobile-media-tray mobile-media-tray--horizontal"
    :scroll-x="scrolling !== false" :scroll-y="false" :show-scrollbar="false" enhanced>
    <slot />
  </scroll-view>
  <view v-else class="mobile-media-tray"><slot /></view>
</template>

<style scoped>
.mobile-media-tray { display: block; width: 100%; min-width: 0; }
.mobile-media-tray--horizontal { height: 112px; }
</style>
